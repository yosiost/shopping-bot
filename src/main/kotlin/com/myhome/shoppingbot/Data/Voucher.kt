package com.myhome.shoppingbot.Data

import jakarta.persistence.Column
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.LocalDate

@Entity
@Table(name = "vouchers")
data class Voucher(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    @Column(unique = true)
    val voucherNumber: String,
    val provider: String,
    val amount: Double,
    var balance: Double,
    val expiryDate: LocalDate,
    val vendor: String? = null,
    val remarks: String? = null
)
