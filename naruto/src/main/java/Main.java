import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Paths;

public class Main {
    static String supabaseUrl = "https://gupnlcjeuujxkbwvqdkx.supabase.co/rest/v1/naruto?select=*";
    static String supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cG5sY2pldXVqeGtid3ZxZGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODcxMjUsImV4cCI6MjA5MzM2MzEyNX0.T7GAFlKg7xO9XPyCq9DBjR9a5EEPZ3CtuBgi12tJ2xs";

    public static void main(String[] args) throws Exception {
        int port = System.getenv("PORT") != null ? Integer.parseInt(System.getenv("PORT")) : 3002;
        
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api/naruto", new NarutoHandler());
        server.createContext("/api-docs", new SwaggerHandler());
        
        server.setExecutor(null);
        System.out.println("Naruto Service (REST Proxy) running on port " + port);
        server.start();
    }

    static class NarutoHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, OPTIONS");
            exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
            exchange.getResponseHeaders().add("Content-Type", "application/json");

            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            if ("GET".equals(exchange.getRequestMethod())) {
                try {
                    HttpClient client = HttpClient.newHttpClient();
                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(supabaseUrl))
                            .header("apikey", supabaseKey)
                            .header("Authorization", "Bearer " + supabaseKey)
                            .GET()
                            .build();

                    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                    
                    String responseBody = response.body();
                    exchange.sendResponseHeaders(response.statusCode(), responseBody.getBytes().length);
                    OutputStream os = exchange.getResponseBody();
                    os.write(responseBody.getBytes());
                    os.close();
                } catch (Exception e) {
                    e.printStackTrace();
                    String error = "{\"error\": \"Error communicating with Supabase\"}";
                    exchange.sendResponseHeaders(500, error.getBytes().length);
                    OutputStream os = exchange.getResponseBody();
                    os.write(error.getBytes());
                    os.close();
                }
            } else {
                exchange.sendResponseHeaders(405, -1);
            }
        }
    }

    static class SwaggerHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            
            try {
                String content = new String(Files.readAllBytes(Paths.get("swagger.json")));
                exchange.sendResponseHeaders(200, content.getBytes().length);
                OutputStream os = exchange.getResponseBody();
                os.write(content.getBytes());
                os.close();
            } catch (Exception e) {
                String error = "{\"error\": \"Swagger not found\"}";
                exchange.sendResponseHeaders(404, error.getBytes().length);
                OutputStream os = exchange.getResponseBody();
                os.write(error.getBytes());
                os.close();
            }
        }
    }
}
