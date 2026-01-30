package com.example.salha.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/")
    public String home() {
        return "index";
    }

    @GetMapping("/coran")
    public String coran() {
        return "coran";
    }

    @GetMapping("/hadith")
    public String hadith() {
        return "hadith";
    }
}
