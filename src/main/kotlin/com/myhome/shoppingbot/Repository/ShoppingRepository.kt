package com.myhome.shoppingbot.Repository

import com.myhome.shoppingbot.Data.ShoppingItem
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.CrudRepository
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
interface ShoppingRepository : CrudRepository<ShoppingItem, Long> {

    fun findByNameIgnoreCase(name: String): ShoppingItem?

    @Transactional
    @Modifying
    @Query("DELETE FROM ShoppingItem s WHERE LOWER(s.name) = LOWER(:name)")
    fun deleteByNameIgnoreCase(@Param("name") name: String)
}