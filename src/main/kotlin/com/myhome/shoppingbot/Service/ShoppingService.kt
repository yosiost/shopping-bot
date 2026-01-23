package com.myhome.shoppingbot.Service

import com.myhome.shoppingbot.Data.ShoppingItem
import com.myhome.shoppingbot.Repository.ShoppingRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ShoppingService (private val repository: ShoppingRepository, private val voucherService: VoucherService) {

    @Transactional
    fun processIncomingMessage(body: String, sender: String): List<String> {
        val input = body.trim().lowercase()

        val result: List<String> = when {
            input == "help" || input == "עזרה" || input == "menu" ->
                listOf(getHelpMenu())

            input.startsWith("add voucher") || input.startsWith("הוסף שובר") ->
                listOf(voucherService.addVoucher(body))

            input == "vouchers" || input == "שוברים" ->
                voucherService.getVouchers(null)

            input.startsWith("get voucher ") || input.startsWith("שובר ") -> {
                val provider = body.split(" ").last()
                // ENSURE THIS IS THE LAST LINE IN THIS BLOCK
                voucherService.getVouchers(provider)
            }

            input.startsWith("delete voucher") || input.startsWith("מחק שובר") -> {
                val number = body.split(" ").last()
                listOf(voucherService.deleteVoucher(number))
            }

            input == "list" || input == "רשימה" -> listOf(formatList() ?: "List is empty")
            input == "clear" || input == "נקה" -> listOf(clearList() ?: "Cleared")

            input.startsWith("למחוק ") -> listOf(removeItem(body.substring(6).trim()) ?: "Removed")
            input.startsWith("מחק ") -> listOf(removeItem(body.substring(4).trim()) ?: "Removed")
            input.startsWith("הסר ") -> listOf(removeItem(body.substring(4).trim()) ?: "Removed")
            input.startsWith("קניתי ") -> listOf(removeItem(body.substring(6).trim()) ?: "Removed")
            input.startsWith("delete ") -> listOf(removeItem(body.substring(7).trim()) ?: "Removed")

            else -> {
                val added = addItem(input, sender)
                listOf(added ?: "Item added")
            }
        }

        return result
    }

    private fun formatList(): String {
        val items = repository.findAll()
        return if (items.none()) {
            "The list is empty! \uD83C\uDFE0"
        } else {
            "🛒 *Current Shopping List:*\n" + items.joinToString("\n") { "- ${it.name}" }
        }
    }

    private fun clearList(): String {
        repository.deleteAll()
        return "List cleared! \u2705"
    }

    private fun addItem(name: String, addedBy: String): String {
        repository.save(ShoppingItem(name = name, addedBy = addedBy))
        return "Added *$name* to the list. 📝"
    }

    private fun removeItem(itemName: String): String {
        val name = itemName.trim()
        val item = repository.findByNameIgnoreCase(name)
        if (item == null) {
            return "Item *$name* not found. \uD83E\uDD14"
        }
        repository.deleteByNameIgnoreCase(name)
        return "Removed *$name* from the list. ✅"
    }

    private fun getHelpMenu(): String {
        return """
        *🛍️ Shopping List / רשימת קניות*
        • *<item name>* : Add item / הוספת פריט
        • *list* or *רשימה* : View list / הצגת הרשימה
        • *קניתי/מחק/הסר <item>* : Remove item / מחיקת פריט
        • *clear* or *נקה* : Delete all / ניקוי רשימה
        
        *🎫 Vouchers / שוברים*
        • *add voucher <provider> <number> <expiry> <balance> <amount>*
        • *הוסף שובר <חברה> <מספר> <תוקף> <יתרה> <סכום מקור>*
        • *vouchers* or *שוברים* : Show all / כל השוברים
        • *get voucher <provider>* or *שובר <חברה>* : Filter by company
        • *delete voucher <number>* or *מחק שובר <מספר>* : Remove voucher
            """.trimIndent()
    }

}