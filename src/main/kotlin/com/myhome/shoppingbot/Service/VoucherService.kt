package com.myhome.shoppingbot.Service

import com.myhome.shoppingbot.Data.Voucher
import com.myhome.shoppingbot.Repository.VoucherRepository
import com.myhome.shoppingbot.Vouchers.VoucherBalanceFetcher
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.transaction.annotation.Transactional
import org.springframework.stereotype.Service
import java.time.LocalDate

@Service
class VoucherService(private val repository: VoucherRepository, private val fetchers: List<VoucherBalanceFetcher>) {
    private val logger = LoggerFactory.getLogger(VoucherService::class.java)

    @Transactional
    fun addVoucher(input: String): String {
        // Expected format: add voucher <voucher_number> <provider> <amount> <yyyy-mm-dd>
        val parts = input.split(" ")
        if (parts.size < 6) {
            return "Invalid voucher format. Please use: <voucher_number> <provider> <amount>  <yyyy-mm-dd> [vendor] [remarks]"
        }

        return try {
            val voucher = Voucher(
                voucherNumber = parts[2],
                provider = parts[3],
                amount = parts[4].toDouble(),
                balance = parts[4].toDouble(),
                expiryDate = LocalDate.parse(parts[5]),
                vendor = if (parts.size > 6) parts[6] else null,
                remarks = if (parts.size > 7) parts.drop(7).joinToString(" ") else null
            )
            repository.save(voucher)
            "Voucher ${voucher.provider} added successfully."
        } catch (e: Exception) {
            "Failed to add voucher: ${e.message}"
        }
    }

    fun getVouchers(provider: String? = null): List<String> {
        val vouchers = if (provider.isNullOrBlank()) {
            repository.findByBalanceGreaterThan(0.0)
        } else {
            repository.findByProviderAndBalanceGreaterThan(provider, 0.0)
        }

        if (vouchers.isEmpty()) return listOf("No active vouchers found. 💸")
        logger.info("Found ${vouchers.size} vouchers to refresh.")
        runBlocking {
            vouchers.map { voucher ->
                async(Dispatchers.IO) {
                    try {
                        val fetcher = fetchers.firstOrNull { it.supports(voucher.provider) }
                        if (fetcher == null) {
                            logger.info("No fetcher found for ${voucher.provider}")
                        }
                        val updatedBalance: Double? = fetcher?.fetch(voucher)

                        if (updatedBalance != null) {
                            logger.info("Updated balance for ${voucher.provider}: ${voucher.voucherNumber} to $updatedBalance")
                            voucher.balance = updatedBalance
                            repository.save(voucher)
                        } else {
                            logger.info("Failed to refresh ${voucher.provider}: ${voucher.voucherNumber}")
                        }
                    } catch (e: Exception) {
                        logger.error("Error fetching ${voucher.provider}: ${e.message}")
                    }
                }
            }.awaitAll()
        }

        val sortedVouchers = vouchers.sortedWith(
            compareBy<Voucher> { it.provider }
                .thenBy { it.expiryDate }
        )

        return sortedVouchers.map {
            val vendorInfo = if (!it.vendor.isNullOrBlank()) " | Vendor: ${it.vendor}" else ""
            val remarksInfo = if (!it.remarks.isNullOrBlank()) "\n📝 _${it.remarks}_" else ""

            "🔹 *${it.provider}*: ₪${it.balance} (Exp: ${it.expiryDate})$vendorInfo\n`[${it.voucherNumber}]`$remarksInfo"
        }.chunked(10).map { chunk ->
            chunk.joinToString("\n\n----------------\n\n")
        }
    }

    @Transactional
    fun deleteVoucher(voucherNumber: String): String {
        val exists = repository.findByVoucherNumber(voucherNumber)
        return if (exists != null) {
            repository.deleteByVoucherNumber(voucherNumber)
            "Voucher $voucherNumber deleted. 🗑️"
        } else {
            "Voucher $voucherNumber not found."
        }
    }
}