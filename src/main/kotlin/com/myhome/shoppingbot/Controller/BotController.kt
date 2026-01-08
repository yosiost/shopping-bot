package com.myhome.shoppingbot.Controller

import com.myhome.shoppingbot.Service.ShoppingService
import com.twilio.twiml.MessagingResponse
import com.twilio.twiml.messaging.Message
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/whatsapp")
class BotController (private val shoppingService: ShoppingService) {

    @PostMapping(consumes = [MediaType.APPLICATION_FORM_URLENCODED_VALUE], produces = ["application/xml"])
    fun handleWhatsApp(
        @RequestParam("Body") body: String,
        @RequestParam("From") from: String
    ): String {
        val sender = from.replace("whatsapp:", "")

        val responseText = shoppingService.processIncomingMessage(body, sender)

        return MessagingResponse.Builder()
            .message(Message.Builder(responseText).build())
            .build()
            .toXml()
    }
}