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

    // ── Grocery (listType IS NULL or 'GROCERY') ───────────────────────────────

    @Query("SELECT s FROM ShoppingItem s WHERE s.listType IS NULL OR s.listType = 'GROCERY'")
    fun findAllGrocery(): List<ShoppingItem>

    @Query("SELECT s FROM ShoppingItem s WHERE LOWER(s.name) = LOWER(:name) AND (s.listType IS NULL OR s.listType = 'GROCERY')")
    fun findGroceryByName(@Param("name") name: String): ShoppingItem?

    @Transactional
    @Modifying
    @Query("DELETE FROM ShoppingItem s WHERE LOWER(s.name) = LOWER(:name) AND (s.listType IS NULL OR s.listType = 'GROCERY')")
    fun deleteGroceryByName(@Param("name") name: String)

    @Transactional
    @Modifying
    @Query("DELETE FROM ShoppingItem s WHERE s.listType IS NULL OR s.listType = 'GROCERY'")
    fun deleteAllGrocery()

    // ── Home (listType = 'HOME') ───────────────────────────────────────────────

    @Query("SELECT s FROM ShoppingItem s WHERE s.listType = 'HOME'")
    fun findAllHome(): List<ShoppingItem>

    @Query("SELECT s FROM ShoppingItem s WHERE LOWER(s.name) = LOWER(:name) AND s.listType = 'HOME'")
    fun findHomeByName(@Param("name") name: String): ShoppingItem?

    @Transactional
    @Modifying
    @Query("DELETE FROM ShoppingItem s WHERE LOWER(s.name) = LOWER(:name) AND s.listType = 'HOME'")
    fun deleteHomeByName(@Param("name") name: String)

    @Transactional
    @Modifying
    @Query("DELETE FROM ShoppingItem s WHERE s.listType = 'HOME'")
    fun deleteAllHome()
}
