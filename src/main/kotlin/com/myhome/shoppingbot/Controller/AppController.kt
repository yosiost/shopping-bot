package com.myhome.shoppingbot.Controller

import com.myhome.shoppingbot.Data.AppUser
import com.myhome.shoppingbot.Data.ShoppingItem
import com.myhome.shoppingbot.Data.Voucher
import com.myhome.shoppingbot.Repository.AppUserRepository
import com.myhome.shoppingbot.Repository.ShoppingRepository
import com.myhome.shoppingbot.Repository.VoucherRepository
import com.myhome.shoppingbot.Service.VoucherService
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDate
import java.time.LocalDateTime

@RestController
@RequestMapping("/api")
class AppController(
    private val shoppingRepository: ShoppingRepository,
    private val appUserRepository: AppUserRepository,
    private val voucherRepository: VoucherRepository,
    private val voucherService: VoucherService
) {

    // Builds a email/phone → alias map from the users table (user count is tiny)
    private fun aliasMap(): Map<String, String> {
        val users = appUserRepository.findAll().toList()
        val byEmail = users.associate { it.email to it.alias }
        val byPhone = users.filter { it.phoneNumber != null }.associate { it.phoneNumber!! to it.alias }
        return byEmail + byPhone
    }

    private fun ShoppingItem.toResponse(aliases: Map<String, String>) = mapOf(
        "id"           to id,
        "name"         to name,
        "addedBy"      to addedBy,
        "addedByAlias" to (aliases[addedBy] ?: addedBy.substringBefore('@')),
        "createdAt"    to createdAt,
        "listType"     to listType
    )

    // ── Grocery shopping list ─────────────────────────────────────────────────

    @GetMapping("/shopping")
    fun getShoppingList(): List<Map<String, Any?>> {
        val aliases = aliasMap()
        return shoppingRepository.findAllGrocery().map { it.toResponse(aliases) }
    }

    @PostMapping("/shopping")
    fun addShoppingItem(@RequestBody req: AddItemRequest, request: HttpServletRequest): ResponseEntity<Any> {
        val name = req.name.trim()
        if (name.isBlank()) return ResponseEntity.badRequest().body(mapOf("error" to "Name required"))
        val existing = shoppingRepository.findGroceryByName(name)
        if (existing != null) return ResponseEntity.ok(existing.toResponse(aliasMap()))
        val email = request.getSession(false)?.getAttribute("email") as? String ?: "web"
        return ResponseEntity.ok(shoppingRepository.save(ShoppingItem(name = name, addedBy = email)).toResponse(aliasMap()))
    }

    @DeleteMapping("/shopping/{name}")
    fun removeShoppingItem(@PathVariable name: String): ResponseEntity<Unit> {
        shoppingRepository.findGroceryByName(name) ?: return ResponseEntity.notFound().build()
        shoppingRepository.deleteGroceryByName(name)
        return ResponseEntity.ok().build()
    }

    @DeleteMapping("/shopping")
    fun clearShoppingList(): ResponseEntity<Unit> {
        shoppingRepository.deleteAllGrocery()
        return ResponseEntity.ok().build()
    }

    // ── Home shopping list ────────────────────────────────────────────────────

    @GetMapping("/home")
    fun getHomeList(): List<Map<String, Any?>> {
        val aliases = aliasMap()
        return shoppingRepository.findAllHome().map { it.toResponse(aliases) }
    }

    @PostMapping("/home")
    fun addHomeItem(@RequestBody req: AddItemRequest, request: HttpServletRequest): ResponseEntity<Any> {
        val name = req.name.trim()
        if (name.isBlank()) return ResponseEntity.badRequest().body(mapOf("error" to "Name required"))
        val existing = shoppingRepository.findHomeByName(name)
        if (existing != null) return ResponseEntity.ok(existing.toResponse(aliasMap()))
        val email = request.getSession(false)?.getAttribute("email") as? String ?: "web"
        return ResponseEntity.ok(shoppingRepository.save(ShoppingItem(name = name, addedBy = email, listType = "HOME")).toResponse(aliasMap()))
    }

    @DeleteMapping("/home/{name}")
    fun removeHomeItem(@PathVariable name: String): ResponseEntity<Unit> {
        shoppingRepository.findHomeByName(name) ?: return ResponseEntity.notFound().build()
        shoppingRepository.deleteHomeByName(name)
        return ResponseEntity.ok().build()
    }

    @DeleteMapping("/home")
    fun clearHomeList(): ResponseEntity<Unit> {
        shoppingRepository.deleteAllHome()
        return ResponseEntity.ok().build()
    }

    // ── User profile ──────────────────────────────────────────────────────────

    @GetMapping("/users/me")
    fun getMyProfile(request: HttpServletRequest): ResponseEntity<Any> {
        val email = request.getSession(false)?.getAttribute("email") as? String
            ?: return ResponseEntity.status(401).body(mapOf("error" to "Not logged in"))
        val user = appUserRepository.findByEmail(email)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(mapOf("email" to user.email, "alias" to user.alias, "phoneNumber" to user.phoneNumber))
    }

    @PatchMapping("/users/me")
    fun updateMyProfile(@RequestBody req: UpdateProfileRequest, request: HttpServletRequest): ResponseEntity<Any> {
        val email = request.getSession(false)?.getAttribute("email") as? String
            ?: return ResponseEntity.status(401).body(mapOf("error" to "Not logged in"))
        val user = appUserRepository.findByEmail(email)
            ?: return ResponseEntity.notFound().build()
        req.alias?.takeIf { it.isNotBlank() }?.let { user.alias = it.trim() }
        req.phoneNumber?.let { user.phoneNumber = it.trim().takeIf { p -> p.isNotBlank() } }
        appUserRepository.save(user)
        // Refresh alias in session
        request.getSession(false)?.setAttribute("alias", user.alias)
        return ResponseEntity.ok(mapOf("email" to user.email, "alias" to user.alias, "phoneNumber" to user.phoneNumber))
    }

    // ── Users list (for admin view) ───────────────────────────────────────────

    @GetMapping("/users")
    fun listUsers(request: HttpServletRequest): ResponseEntity<Any> {
        request.getSession(false)?.getAttribute("email") as? String
            ?: return ResponseEntity.status(401).body(mapOf("error" to "Not logged in"))
        return ResponseEntity.ok(appUserRepository.findAll().map {
            mapOf("email" to it.email, "alias" to it.alias, "phoneNumber" to it.phoneNumber)
        })
    }

    @PatchMapping("/users/{email}/alias")
    fun updateUserAlias(
        @PathVariable email: String,
        @RequestBody req: UpdateAliasRequest,
        request: HttpServletRequest
    ): ResponseEntity<Any> {
        request.getSession(false)?.getAttribute("email") as? String
            ?: return ResponseEntity.status(401).body(mapOf("error" to "Not logged in"))
        val alias = req.alias.trim()
        if (alias.isBlank()) return ResponseEntity.badRequest().body(mapOf("error" to "Alias required"))
        val user = appUserRepository.findByEmail(email) ?: return ResponseEntity.notFound().build()
        user.alias = alias
        appUserRepository.save(user)
        return ResponseEntity.ok(mapOf("email" to user.email, "alias" to user.alias))
    }

    @PatchMapping("/users/{email}/phone")
    fun updateUserPhone(
        @PathVariable email: String,
        @RequestBody req: UpdatePhoneRequest,
        request: HttpServletRequest
    ): ResponseEntity<Any> {
        request.getSession(false)?.getAttribute("email") as? String
            ?: return ResponseEntity.status(401).body(mapOf("error" to "Not logged in"))
        val user = appUserRepository.findByEmail(email) ?: return ResponseEntity.notFound().build()
        user.phoneNumber = req.phoneNumber.trim().takeIf { it.isNotBlank() }
        appUserRepository.save(user)
        return ResponseEntity.ok(mapOf("email" to user.email, "alias" to user.alias, "phoneNumber" to user.phoneNumber))
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
data class UpdateProfileRequest(val alias: String?, val phoneNumber: String?)
data class UpdateAliasRequest(val alias: String)
data class UpdatePhoneRequest(val phoneNumber: String)
data class AddVoucherRequest(
    val voucherNumber: String,
    val provider:      String,
    val amount:        Double,
    val balance:       Double?,
    val expiryDate:    String,
    val vendor:        String?,
    val remarks:       String?
)
