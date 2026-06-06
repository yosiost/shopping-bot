package com.myhome.shoppingbot.Data

import jakarta.persistence.Column
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDate
import java.time.LocalDateTime

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
    val remarks: String? = null,
    // Soft delete — null means legacy row (treat as not deleted)
    var deleted: Boolean? = null,
    @CreationTimestamp
    var createdAt: LocalDateTime? = null,
    @UpdateTimestamp
    var modifiedAt: LocalDateTime? = null
)
