package com.myhome.shoppingbot.Data

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "app_users")
class AppUser(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(unique = true, nullable = false)
    val email: String,

    // Display name shown in the app — defaults to the part before @ on first login
    var alias: String,

    // Optional: links a WhatsApp sender number to this user for 'added by' resolution
    var phoneNumber: String? = null
)
