package com.myhome.shoppingbot.Controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class SystemController {
    @GetMapping("/health")
    fun healthCheck(): Map<String, Any> {
        return mapOf(
            "status" to "UP",
            "timestamp" to System.currentTimeMillis(),
            "message" to "Bot is awake and healthy!"
        )
    }
}