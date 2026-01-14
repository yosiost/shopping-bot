package com.myhome.shoppingbot.Vouchers

import com.myhome.shoppingbot.Data.Voucher

interface VoucherBalanceFetcher {
    fun supports(providerName: String): Boolean
    fun fetch(voucher: Voucher): Double?
}