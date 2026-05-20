package com.api.controller;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/naruto")
@CrossOrigin("*")
public class NarutoController {

    @GetMapping
    public List<Map<String, Object>> getAll() {

        return List.of(

            Map.of(
                "id", 1,
                "nombre", "Naruto Uzumaki",
                "aldea", "Konoha",
                "rango", "Hokage",
                "imagen",
                "https://i.imgur.com/2yaf2wb.png"
            )
        );
    }
}
