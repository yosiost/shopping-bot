package com.myhome.shoppingbot.Vouchers.Providers

import com.myhome.shoppingbot.Data.Voucher
import com.myhome.shoppingbot.Vouchers.VoucherBalanceFetcher
import org.slf4j.LoggerFactory
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate
import org.springframework.web.util.UriComponentsBuilder

@Component
class BuyMe (private val restTemplate: RestTemplate) : VoucherBalanceFetcher {
    private val logger = LoggerFactory.getLogger(KsharimPlus::class.java)

    override fun supports(providerName: String) =
        providerName.equals("ביימי", true) || providerName.equals("BuyMe", true)

    override fun fetch(voucher: Voucher) : Double? {
        return try {
            val uri = UriComponentsBuilder.fromUriString("https://buyme.co.il/siteapi/voucherBalance")
                .queryParam("serialNumber", voucher.voucherNumber)
                .queryParam("expiryDate", voucher.expiryDate.toString())
                .build()
                .toUri()

            val response = restTemplate.exchange(uri, HttpMethod.GET, HttpEntity<Any>(HttpHeaders()), Map::class.java).body
            (response?.get("value") as? Number)?.toDouble()
        } catch (e: Exception) {
            logger.error("BuyMe Error: ${e.message}")
            null
        }
    }
}