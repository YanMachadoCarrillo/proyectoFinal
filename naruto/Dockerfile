FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/naruto-service-1.0-SNAPSHOT-jar-with-dependencies.jar ./app.jar
COPY swagger.json .
EXPOSE 3002
CMD ["java", "-jar", "app.jar"]
