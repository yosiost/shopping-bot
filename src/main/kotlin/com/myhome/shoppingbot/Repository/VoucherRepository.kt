package com.myhome.shoppingbot.Repository

import com.myhome.shoppingbot.Data.Voucher
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.CrudRepository
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
interface VoucherRepository : CrudRepository<Voucher, Long> {

    // Legacy hard-delete used by WhatsApp commands
    @Transactional
    @Modifying
    @Query("DELETE FROM Voucher v WHERE v.voucherNumber = :number")
    fun deleteByVoucherNumber(@Param("number") number: String): Long

    // "Active" = not soft-deleted (deleted is null or false)
    @Query("SELECT v FROM Voucher v WHERE v.voucherNumber = :num AND (v.deleted IS NULL OR v.deleted = false)")
    fun findActiveByVoucherNumber(@Param("num") num: String): Voucher?

    @Query("SELECT v FROM Voucher v WHERE (v.deleted IS NULL OR v.deleted = false) AND v.balance > :balance")
    fun findActiveByBalanceGreaterThan(@Param("balance") balance: Double): List<Voucher>

    @Query("SELECT v FROM Voucher v WHERE (v.deleted IS NULL OR v.deleted = false) AND v.provider = :provider AND v.balance > :balance")
    fun findActiveByProviderAndBalanceGreaterThan(@Param("provider") provider: String, @Param("balance") balance: Double): List<Voucher>
}
