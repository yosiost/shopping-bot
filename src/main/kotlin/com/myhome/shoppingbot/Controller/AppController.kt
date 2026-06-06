package com.myhome.shoppingbot.Controller

import com.myhome.shoppingbot.Data.ShoppingItem
import com.myhome.shoppingbot.Data.Voucher
import com.myhome.shoppingbot.Repository.ShoppingRepository
import com.myhome.shoppingbot.Repository.VoucherRepository
import com.myhome.shoppingbot.Service.VoucherService
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDate

@RestController
@RequestMapping("/api")
class AppController(
    private val shoppingRepository: ShoppingRepository,
    private val voucherRepository: VoucherRepository,
    private val voucherService: VoucherService
) {

    // ── Shopping ──────────────────────────────────────────────────────────────

    @GetMapping("/shopping")
    fun getShoppingList(): List<ShoppingItem> = shoppingRepository.findAll().toList()

    @PostMapping("/shopping")
    fun addShoppingItem(@RequestBody req: AddItemRequest, request: HttpServletRequest): ResponseEntity<Any> {
        val name = req.name.trim()
        if (name.isBlank()) return ResponseEntity.badRequest().body(mapOf("error" to "Name required"))
        val existing = shoppingRepository.findByNameIgnoreCase(name)
        if (existing != null) return ResponseEntity.ok(existing)
        val email = request.getSession(false)?.getAttribute("email") as? String ?: "web"
        return ResponseEntity.ok(shoppingRepository.save(ShoppingItem(name = name, addedBy = email)))
    }

    @DeleteMapping("/shopping/{name}")
    fun removeShoppingItem(@PathVariable name: String): ResponseEntity<Unit> {
        shoppingRepository.findByNameIgnoreCase(name) ?: return ResponseEntity.notFound().build()
        shoppingRepository.deleteByNameIgnoreCase(name)
        return ResponseEntity.ok().build()
    }

    @DeleteMapping("/shopping")
    fun clearShoppingList(): ResponseEntity<Unit> {
        shoppingRepository.deleteAll()
        return ResponseEntity.ok().build()
    }

    // ── Vouchers ──────────────────────────────────────────────────────────────

    private fun voucherAccess(request: HttpServletRequest): Boolean =
        request.getSession(false)?.getAttribute("canViewVouchers") as? Boolean ?: true

    @GetMapping("/vouchers")
    fun getVouchers(request: HttpServletRequest): ResponseEntity<Any> {
        if (!voucherAccess(request)) return ResponseEntity.status(403).body(mapOf("error" to "Access denied"))
        return ResponseEntity.ok(voucherService.listVouchersRaw())
    }

    @PostMapping("/vouchers/refresh")
    fun refreshVouchers(request: HttpServletRequest): ResponseEntity<Any> {
        if (!voucherAccess(request)) return ResponseEntity.status(403).body(mapOf("error" to "Access denied"))
        return ResponseEntity.ok(voucherService.refreshVouchersRaw())
    }

    @PostMapping("/vouchers")
    fun addVoucher(@RequestBody req: AddVoucherRequest, request: HttpServletRequest): ResponseEntity<Any> {
        if (!voucherAccess(request)) return ResponseEntity.status(403).body(mapOf("error" to "Access denied"))
        return try {
            val voucher = Voucher(
                voucherNumber = req.voucherNumber,
                provider      = req.provider,
                amount        = req.amount,
                balance       = req.balance ?: req.amount,
                expiryDate    = LocalDate.parse(req.expiryDate),
                vendor        = req.vendor?.takeIf  { it.isNotBlank() },
                remarks       = req.remarks?.takeIf { it.isNotBlank() }
            )
            ResponseEntity.ok(voucherRepository.save(voucher))
        } catch (e: Exception) {
            ResponseEntity.badRequest().body(mapOf("error" to (e.message ?: "Invalid data")))
        }
    }

    @PatchMapping("/vouchers/{number}/balance")
    fun updateVoucherBalance(
        @PathVariable number: String,
        @RequestBody req: UpdateBalanceRequest,
        request: HttpServletRequest
    ): ResponseEntity<Any> {
        if (!voucherAccess(request)) return ResponseEntity.status(403).body(mapOf("error" to "Access denied"))
        val voucher = voucherRepository.findActiveByVoucherNumber(number)
            ?: return ResponseEntity.notFound().build()
        voucher.balance = req.balance
        return ResponseEntity.ok(voucherRepository.save(voucher))
    }

    @DeleteMapping("/vouchers/{number}")
    fun deleteVoucher(@PathVariable number: String, request: HttpServletRequest): ResponseEntity<Any> {
        if (!voucherAccess(request)) return ResponseEntity.status(403).body(mapOf("error" to "Access denied"))
        val voucher = voucherRepository.findActiveByVoucherNumber(number)
            ?: return ResponseEntity.notFound().build()
        voucher.deleted = true
        voucherRepository.save(voucher)
        return ResponseEntity.ok().build()
    }
}

data class AddItemRequest(val name: String)
data class UpdateBalanceRequest(val balance: Double)
data class AddVoucherRequest(
    val voucherNumber: String,
    val provider:      String,
    val amount:        Double,
    val balance:       Double?,
    val expiryDate:    String,
    val vendor:        String?,
    val remarks:       String?
)
