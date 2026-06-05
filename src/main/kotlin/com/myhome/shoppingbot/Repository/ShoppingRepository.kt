package com.myhome.shoppingbot.Repository

import com.myhome.shoppingbot.Data.ShoppingItem
import org.springframework.data.repository.CrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
interface ShoppingRepository : CrudRepository<ShoppingItem, Long> {

    fun findByNameIgnoreCase(name: String): ShoppingItem?

    @Transactional
    fun deleteByNameIgnoreCase(name: String)
}