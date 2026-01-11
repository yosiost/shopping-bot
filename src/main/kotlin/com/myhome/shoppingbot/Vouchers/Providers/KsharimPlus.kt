package com.myhome.shoppingbot.Vouchers.Providers

import com.myhome.shoppingbot.Vouchers.VoucherBalanceFetcher
import org.slf4j.LoggerFactory
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate

@Component
class KsharimPlus (private val restTemplate: RestTemplate) : VoucherBalanceFetcher {
    private val logger = LoggerFactory.getLogger(KsharimPlus::class.java)

    override fun supports(providerName: String) =
        providerName.equals("קשריםפלוס", true) || providerName.equals("KsharimPlus", true)

    override fun fetch(voucherNumber: String): Double? {
        return try {
            val url = "https://portal.ksharimplus.co.il/KsharimPlusWs/api/Codes/HistoryMultipass"
            val parts = voucherNumber.split("-")
            if (parts.size < 2) return null

            val cardNum = parts[0]
            val pin = parts[1]

            val headers = HttpHeaders()
            headers.contentType = MediaType.APPLICATION_JSON
            headers.set("Authorization", "Bearer null")
            headers.set("User-Agent", "Mozilla/5.0") // Good practice to avoid being blocked

            val body = mapOf(
                "CardNum" to cardNum,
                "PinNumber" to pin
            )

            val request = HttpEntity(body, headers)
            logger.info("Fetching balance for card: $cardNum")
            val response = restTemplate.postForObject(url, request, Map::class.java)
            logger.info("Full API Response from KsharimPlus: $response")
            val balance = (response?.get("balance") as? Number)?.toDouble()
            logger.info("Extracted balance: $balance")
            balance
        } catch (e: Exception) {
            println("KsharimPlus Fetch Error: ${e.message}")
            null
        }
    }
}