package com.myhome.shoppingbot.Controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class SystemController {
    @GetMapping("/health")
    fun healthCheck(): String {
        return "Bot is awake and healthy!"
    }
}