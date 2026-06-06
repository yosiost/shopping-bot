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
        val parts = input.split(" ")
        if (parts.size < 6) {
            return "Invalid voucher format. Please use: <voucher_number> <provider> <amount> <yyyy-mm-dd> [vendor] [remarks]"
        }

        return try {
            val voucher = Voucher(
                voucherNumber = parts[2],
                provider      = parts[3],
                amount        = parts[4].toDouble(),
                balance       = parts[4].toDouble(),
                expiryDate    = LocalDate.parse(parts[5]),
                vendor        = if (parts.size > 6) parts[6] else null,
                remarks       = if (parts.size > 7) parts.drop(7).joinToString(" ") else null
            )
            repository.save(voucher)
            "Voucher ${voucher.provider} added successfully."
        } catch (e: Exception) {
            "Failed to add voucher: ${e.message}"
        }
    }

    private fun fetchActiveVouchers(provider: String? = null): List<Voucher> {
        val today = LocalDate.now()
        val all = if (provider.isNullOrBlank())
            repository.findActiveByBalanceGreaterThan(0.0)
        else
            repository.findActiveByProviderAndBalanceGreaterThan(provider, 0.0)
        return all.filter { !it.expiryDate.isBefore(today) }
    }

    private fun refreshBalances(vouchers: List<Voucher>) {
        if (vouchers.isEmpty()) return
        runBlocking {
            vouchers.map { voucher ->
                async(Dispatchers.IO) {
                    try {
                        val fetcher = fetchers.firstOrNull { it.supports(voucher.provider) }
                        val updatedBalance: Double? = fetcher?.fetch(voucher)
                        if (updatedBalance != null) {
                            logger.info("Updated balance for ${voucher.provider}:${voucher.voucherNumber} to $updatedBalance")
                            voucher.balance = updatedBalance
                            repository.save(voucher)
                        }
                    } catch (e: Exception) {
                        logger.error("Error fetching ${voucher.provider}: ${e.message}")
                    }
                }
            }.awaitAll()
        }
    }

    fun getVouchers(provider: String? = null): List<String> {
        val activeVouchers = fetchActiveVouchers(provider)
        if (activeVouchers.isEmpty()) return listOf("No active or unexpired vouchers found. 💸")
        logger.info("Found ${activeVouchers.size} unexpired vouchers to refresh.")
        refreshBalances(activeVouchers)
        val sortedVouchers = activeVouchers.sortedWith(compareBy<Voucher> { it.provider }.thenBy { it.expiryDate })
        return sortedVouchers.map {
            val vendorInfo  = if (!it.vendor.isNullOrBlank())  " | Vendor: ${it.vendor}"  else ""
            val remarksInfo = if (!it.remarks.isNullOrBlank()) "\n📝 _${it.remarks}_"       else ""
            "🔹 *${it.provider}*: ₪${it.balance} (Exp: ${it.expiryDate})$vendorInfo\n`[${it.voucherNumber}]`$remarksInfo"
        }.chunked(10).map { chunk -> chunk.joinToString("\n\n----------------\n\n") }
    }

    fun listVouchersRaw(): List<Voucher> =
        fetchActiveVouchers().sortedWith(compareBy<Voucher> { it.provider }.thenBy { it.expiryDate })

    fun refreshVouchersRaw(): List<Voucher> {
        val active = fetchActiveVouchers()
        refreshBalances(active)
        return active.sortedWith(compareBy<Voucher> { it.provider }.thenBy { it.expiryDate })
    }

    @Transactional
    fun deleteVoucher(voucherNumber: String): String {
        val voucher = repository.findActiveByVoucherNumber(voucherNumber)
        return if (voucher != null) {
            voucher.deleted = true
            repository.save(voucher)
            "Voucher $voucherNumber deleted. 🗑️"
        } else {
            "Voucher $voucherNumber not found."
        }
    }
}
