package com.myhome.shoppingbot.Vouchers.Providers

import com.myhome.shoppingbot.Data.Voucher
import com.myhome.shoppingbot.Vouchers.VoucherBalanceFetcher
import org.slf4j.LoggerFactory
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
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

            val map = LinkedMultiValueMap<String, String>()
            map.add("card", voucher.voucherNumber)
            map.add("g-recaptcha-response", "") // We leave this empty and hope for the best

            val request = HttpEntity(map, headers)

            val html = restTemplate.postForObject(url, request, String::class.java) ?: ""
            val doc = org.jsoup.Jsoup.parse(html)

            val balanceElement = doc.select("div:contains(יתרה) + .FieldValue").first()
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