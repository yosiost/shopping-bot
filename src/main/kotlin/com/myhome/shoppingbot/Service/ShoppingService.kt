package com.myhome.shoppingbot.Service

import com.myhome.shoppingbot.Data.ShoppingItem
import com.myhome.shoppingbot.Repository.ShoppingRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ShoppingService (private val repository: ShoppingRepository) {

    @Transactional
    fun processIncomingMessage(body: String, sender: String): String {
        val input = body.trim().lowercase()

        return when {
            input == "list" || input == "רשימה" -> formatList()
            input == "clear" || input == "נקה" -> clearList()
            input.startsWith("למחוק ") -> removeItem(body.substring(6).trim())
            input.startsWith("מחק ") -> removeItem(body.substring(4).trim())
            input.startsWith("הסר ") -> removeItem(body.substring(4).trim())
            input.startsWith("קניתי ") -> removeItem(body.substring(6).trim())
            input.startsWith("delete ") -> removeItem(body.substring(7).trim())
            else -> addItem(input, sender)
            }
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

}