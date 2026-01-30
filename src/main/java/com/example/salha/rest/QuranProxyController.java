package com.example.salha.rest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/quran")
public class QuranProxyController {

    private final RestTemplate restTemplate;

    public QuranProxyController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // GET http://localhost:8080/api/quran/surah
    @GetMapping("/surah")
    public ResponseEntity<String> getAllSurahs() {
        String url = "https://api.alquran.cloud/v1/surah";
        return ResponseEntity.ok(restTemplate.getForObject(url, String.class));
    }

    // GET http://localhost:8080/api/quran/surah/1
    @GetMapping("/surah/{id}")
    public ResponseEntity<String> getSurahById(@PathVariable int id) {
        // Editions : récitation ar + translit + 2 traductions fr (comme dans ton commentaire)
        String url = "https://api.alquran.cloud/v1/surah/" + id +
                "/editions/ar.hudhaify,en.transliteration,fr.leclerc,fr.hamidullah";
        return ResponseEntity.ok(restTemplate.getForObject(url, String.class));
    }
}
