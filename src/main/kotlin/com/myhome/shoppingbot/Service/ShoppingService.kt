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

}