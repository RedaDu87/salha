package com.example.salha.rest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/hadith")
public class HadithProxyController {

    private final RestTemplate restTemplate;
    private static final String BASE_URL = "https://hadeethenc.com";

    public HadithProxyController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // ex: GET http://localhost:8080/api/hadith/categories
    @GetMapping("/categories")
    public ResponseEntity<String> getCategories() {
        String url = BASE_URL + "/api/v1/categories/list/?language=fr";
        return ResponseEntity.ok(restTemplate.getForObject(url, String.class));
    }

    // ex: GET http://localhost:8080/api/hadith/list?category_id=1
    @GetMapping("/list")
    public ResponseEntity<String> getHadithList(@RequestParam int category_id) {
        String url = BASE_URL + "/api/v1/hadeeths/list/?language=fr&category_id=" + category_id + "&page=1&per_page=5000";
        return ResponseEntity.ok(restTemplate.getForObject(url, String.class));
    }

    // ex: GET http://localhost:8080/api/hadith/detail?id=5907
    @GetMapping("/detail")
    public ResponseEntity<String> getHadithDetail(@RequestParam int id) {
        String url = BASE_URL + "/api/v1/hadeeths/one/?language=fr&id=" + id;
        return ResponseEntity.ok(restTemplate.getForObject(url, String.class));
    }
}
