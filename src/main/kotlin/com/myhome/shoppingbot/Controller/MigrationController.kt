package com.myhome.shoppingbot.Controller

import com.myhome.shoppingbot.Data.Voucher
import com.myhome.shoppingbot.Repository.VoucherRepository
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/migration")
@ConditionalOnProperty(name = ["app.migration.enabled"], havingValue = "true", matchIfMissing = false)
class MigrationController (private val voucherRepository: VoucherRepository) {

    @PostMapping("/vouchers")
    fun addVouchers(@RequestBody vouchers: List<Voucher>) : ResponseEntity<String> {
        voucherRepository.saveAll(vouchers)
        return ResponseEntity.ok("Successfully added ${vouchers.size} vouchers!")
    }
}