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
                "imagen", "https://automlucas.com/imgNaruto/Naruto.jpg"
            ),

            Map.of(
                "id", 2,
                "nombre", "Sasuke Uchiha",
                "aldea", "Konoha",
                "rango", "Ninja",
                "imagen", "https://automlucas.com/imgNaruto/SasukeUchiha.jpg"
            ),

            Map.of(
                "id", 3,
                "nombre", "Sakura Haruno",
                "aldea", "Konoha",
                "rango", "Médico",
                "imagen", "https://automlucas.com/imgNaruto/SakuraHaruno.jpg"
            ),

            Map.of(
                "id", 4,
                "nombre", "Kakashi Hatake",
                "aldea", "Konoha",
                "rango", "Jonin",
                "imagen", "https://automlucas.com/imgNaruto/KakashiHatake.jpg"
            ),

            Map.of(
                "id", 5,
                "nombre", "Itachi Uchiha",
                "aldea", "Akatsuki",
                "rango", "Ninja",
                "imagen", "https://automlucas.com/imgNaruto/ItachiUchiha.jpg"
            ),

            Map.of(
                "id", 6,
                "nombre", "Gaara",
                "aldea", "Arena",
                "rango", "Kazekage",
                "imagen", "https://automlucas.com/imgNaruto/Gaara.jpg"
            ),

            Map.of(
                "id", 7,
                "nombre", "Rock Lee",
                "aldea", "Konoha",
                "rango", "Ninja",
                "imagen", "https://automlucas.com/imgNaruto/RockLee.jpg"
            ),

            Map.of(
                "id", 8,
                "nombre", "Hinata Hyuga",
                "aldea", "Konoha",
                "rango", "Ninja",
                "imagen", "https://automlucas.com/imgNaruto/HinataHyuga.jpg"
            ),

            Map.of(
                "id", 9,
                "nombre", "Pain",
                "aldea", "Akatsuki",
                "rango", "Líder",
                "imagen", "https://automlucas.com/imgNaruto/Pain.jpg"
            ),

            Map.of(
                "id", 10,
                "nombre", "Madara Uchiha",
                "aldea", "Uchiha",
                "rango", "Legendario",
                "imagen", "https://automlucas.com/imgNaruto/MadaraUchiha.jpg"
            )
        );
    }
}
