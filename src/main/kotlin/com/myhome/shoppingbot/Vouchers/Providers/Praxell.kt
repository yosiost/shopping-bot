package com.myhome.shoppingbot.Vouchers.Providers

import com.myhome.shoppingbot.Data.Voucher
import com.myhome.shoppingbot.Vouchers.VoucherBalanceFetcher
import java.net.URL
import java.net.HttpURLConnection
import java.nio.charset.Charset
import org.slf4j.LoggerFactory
import org.jsoup.Jsoup
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate

@Component
class Praxell (private val restTemplate: RestTemplate) : VoucherBalanceFetcher {
    private val logger = LoggerFactory.getLogger(Praxell::class.java)

    override fun supports(providerName: String) =
        providerName.contains("פרקסל", true) || providerName.contains("Praxell", true)

    override fun fetch(voucher: Voucher): Double? {
        return try {
            val url = URL("https://www.praxellpayroll.com/cardbalance/giftcardGeneral.php")
            val postData = "card=${voucher.voucherNumber}&g-recaptcha-response=".toByteArray(Charsets.UTF_8)

            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
            conn.setRequestProperty("User-Agent", "Mozilla/5.0")
            conn.connectTimeout = 5000
            conn.readTimeout = 5000

            conn.outputStream.use { os -> os.write(postData) }

            val responseText = conn.inputStream.bufferedReader(Charset.forName("Windows-1255")).use { it.readText() }

            val doc = Jsoup.parse(responseText)

            val balanceElement = doc.select("div.FieldTitle:contains(יתרה) ~ div.FieldValue").first()
            val balanceText = balanceElement?.text() ?: ""

            logger.info("Praxell Raw Text: $balanceText")

            val cleanBalance = balanceText.replace(Regex("[^0-9.]"), "").trim()
            cleanBalance.toDoubleOrNull()

        } catch (e: Exception) {
            logger.error("Praxell Fetch Error: ${e.message}")
            null
        }
    }

}