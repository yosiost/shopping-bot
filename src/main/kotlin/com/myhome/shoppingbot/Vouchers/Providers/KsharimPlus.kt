package com.myhome.shoppingbot.Vouchers.Providers

import com.myhome.shoppingbot.Vouchers.VoucherBalanceFetcher
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate

@Component
class KsharimPlus (private val restTemplate: RestTemplate) : VoucherBalanceFetcher {
    override fun supports(providerName: String) = providerName.equals("קשרים פלוס", true)

    override fun fetch(voucherNumber: String): Double? {
        return try {
            val url = "https://portal.ksharimplus.co.il/KsharimPlusWs/api/Codes/HistoryMultipass"
            val response = restTemplate.postForObject(url, mapOf("num" to voucherNumber), Map::class.java)
            (response?.get("balance") as? Number)?.toDouble()
        } catch (e: Exception) {
            null
        }
    }
}