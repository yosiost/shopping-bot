package com.myhome.shoppingbot.Service

import com.myhome.shoppingbot.Data.Voucher
import com.myhome.shoppingbot.Repository.VoucherRepository
import com.myhome.shoppingbot.Vouchers.VoucherBalanceFetcher
import org.springframework.transaction.annotation.Transactional
import org.springframework.stereotype.Service
import java.time.LocalDate

@Service
class VoucherService(private val repository: VoucherRepository, private val fetchers: List<VoucherBalanceFetcher>) {

    @Transactional
    fun addVoucher(input: String): String {
        // Expected format: add voucher <voucher_number> <provider> <amount> <yyyy-mm-dd>
        val parts = input.split(" ")
        if (parts.size < 6) {
            return "Invalid voucher format. Please use: <voucher_number> <provider> <amount>  <yyyy-mm-dd>"
        }

        return try {
            val voucher = Voucher(
                voucherNumber = parts[2],
                provider = parts[3],
                amount = parts[4].toDouble(),
                balance = parts[4].toDouble(),
                expiryDate = LocalDate.parse(parts[5])
            )
            repository.save(voucher)
            "Voucher ${voucher.provider} added successfully."
        } catch (e: Exception) {
            "Failed to add voucher: ${e.message}"
        }
    }

    fun getVouchers(provider: String? = null): String {
        val vouchers = if (provider.isNullOrBlank()) {
            repository.findByBalanceGreaterThan(0.0)
        } else {
            repository.findByProviderAndBalanceGreaterThan(provider, 0.0)
        }

        if (vouchers.isEmpty()) return "No active vouchers found. 💸"

        vouchers.forEach { voucher ->
            try {
                val fetcher = fetchers.firstOrNull { it.supports(voucher.provider) }

                val updatedBalance: Double? = fetcher?.fetch(voucher.voucherNumber)

                if (updatedBalance != null) {
                    voucher.balance = updatedBalance
                    repository.save(voucher)
                }
            } catch (e: Exception) {
                println("Failed to refresh ${voucher.provider}: ${e.message}")
            }
        }

        return vouchers.joinToString("\n") {
            "🔹 *${it.provider}*: ₪${it.balance} (Exp: ${it.expiryDate}) [${it.voucherNumber}]"
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