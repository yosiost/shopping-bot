package com.myhome.shoppingbot.Data

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "shopping_items")
class ShoppingItem(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false)
    val addedBy: String,

    val createdAt: LocalDateTime = LocalDateTime.now(),

    // null / "GROCERY" = grocery list; "HOME" = home list
    var listType: String? = null
)