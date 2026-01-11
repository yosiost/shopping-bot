package com.myhome.shoppingbot.Repository

import com.myhome.shoppingbot.Data.Voucher
import org.springframework.data.repository.CrudRepository

interface VoucherRepository : CrudRepository<Voucher, Long> {
    fun findByVoucherNumber(voucherNumber: String): Voucher?
    fun findByProviderAndBalanceGreaterThan(provider: String, balance: Double): List<Voucher>
    fun findByBalanceGreaterThan(balance: Double): List<Voucher>
    fun deleteByVoucherNumber(voucherNumber: String): Long
}