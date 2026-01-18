package com.myhome.shoppingbot.Controller

import com.myhome.shoppingbot.Data.Voucher
import com.myhome.shoppingbot.Repository.VoucherRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/migration")
class MigrationController (private val voucherRepository: VoucherRepository) {

    @PostMapping("/vouchers")
    fun addVouchers(@RequestBody vouchers: List<Voucher>) : ResponseEntity<String> {
        voucherRepository.saveAll(vouchers)
        return ResponseEntity.ok("Successfully added ${vouchers.size} vouchers!")
    }
}