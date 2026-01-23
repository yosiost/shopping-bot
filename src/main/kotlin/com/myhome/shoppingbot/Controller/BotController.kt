package com.myhome.shoppingbot.Controller

import com.myhome.shoppingbot.Service.NotificationService
import com.myhome.shoppingbot.Service.ShoppingService
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/whatsapp")
class BotController (private val shoppingService: ShoppingService, private val notificationService: NotificationService) {

    @PostMapping(consumes = [MediaType.APPLICATION_FORM_URLENCODED_VALUE], produces = ["application/xml"])
    fun handleWhatsApp(
        @RequestParam("Body") body: String,
        @RequestParam("From") from: String
    ): String {
        val sender = from.replace("whatsapp:", "")

        java.util.concurrent.CompletableFuture.runAsync {
            val responseChunks = shoppingService.processIncomingMessage(body, sender)

            responseChunks.forEach { chunk ->
                notificationService.sendManualMessage(sender, chunk)
            }
        }

        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>"
    }
}