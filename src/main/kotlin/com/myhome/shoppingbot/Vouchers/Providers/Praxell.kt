package com.myhome.shoppingbot.Vouchers.Providers

import com.myhome.shoppingbot.Data.Voucher
import com.myhome.shoppingbot.Vouchers.VoucherBalanceFetcher
import org.slf4j.LoggerFactory
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestTemplate

@Component
class Praxell (private val restTemplate: RestTemplate) : VoucherBalanceFetcher {
    private val logger = LoggerFactory.getLogger(Praxell::class.java)

    override fun supports(providerName: String) =
        providerName.contains("פרקסל", true) || providerName.contains("Praxell", true)

    override fun fetch(voucher: Voucher): Double? {
        return try {
            val url = "https://www.praxellpayroll.com/cardbalance/giftcardGeneral.php"
            val headers = HttpHeaders()
            headers.contentType = MediaType.APPLICATION_FORM_URLENCODED
            headers.set("User-Agent", "Mozilla/5.0")

            val map = LinkedMultiValueMap<String, String>()
            map.add("card", voucher.voucherNumber)
            map.add("g-recaptcha-response", "")

            val request = HttpEntity(map, headers)

            val responseBytes = restTemplate.postForObject(url, request, ByteArray::class.java)

            if (responseBytes == null) return null

            val html = String(responseBytes, Charsets.UTF_8)
            val doc: Document = Jsoup.parse(html)

            val balanceElement = doc.select("div.FieldTitle:contains(יתרה) ~ div.FieldValue").first()
            val balanceText = balanceElement?.text() ?: ""

            logger.info("Praxell Raw Text: $balanceText")

            val cleanBalance = balanceText.replace("₪", "").trim()
            cleanBalance.toDoubleOrNull()

        } catch (e: Exception) {
            logger.error("Praxell Fetch Error: ${e.message}")
            null
        }
    }

}