package com.myhome.shoppingbot.Service

import com.myhome.shoppingbot.Data.Voucher
import com.myhome.shoppingbot.Repository.VoucherRepository
import com.twilio.Twilio
import com.twilio.rest.api.v2010.account.Message
import com.twilio.type.PhoneNumber
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.time.temporal.ChronoUnit

@Service
class NotificationService (
    private val voucherRepository: VoucherRepository,
    @Value("\${TWILIO_ACCOUNT_SID:MISSING_SID}")
    private val accountSid: String,

    @Value("\${TWILIO_AUTH_TOKEN:MISSING_TOKEN}")
    private val authToken: String,

    @Value("\${TWILIO_WHATSAPP_FROM:MISSING_FROM}")
    private val fromNumber: String,

    @Value("\${NOTIFICATION_RECIPIENT:MISSING_RECIPIENT}")
    private val recipientConfig: String) {
    private val logger = LoggerFactory.getLogger(NotificationService::class.java)

    @Scheduled(cron = "0 0 9 * * *")
    fun checkExpiringVouchers() {
        logger.info("Starting daily voucher expiry check...")

        val today = LocalDate.now()
        val oneMonthFromNow = today.plusMonths(1)

        val expiringVouchers = voucherRepository.findByBalanceGreaterThan(0.0)
            .filter { it.expiryDate.isAfter(today.minusDays(1)) && it.expiryDate.isBefore(oneMonthFromNow) }

        if (expiringVouchers.isNotEmpty()) {
            val messageBody = buildExpiryMessage(expiringVouchers, today)
            sendWhatsappNotification(messageBody)
        } else {
            logger.info("No vouchers expiring in the next month.")
        }
    }

    private fun buildExpiryMessage(vouchers: List<Voucher>, today: LocalDate): String {
        val header = "⚠️ *תזכורת: שוברים פוקעים בקרוב* ⚠️\n\n"
        val list = vouchers.joinToString("\n") {
            val daysLeft = ChronoUnit.DAYS.between(today, it.expiryDate)
            "• *${it.provider}* (₪${it.balance}) - פוקע בעוד $daysLeft ימים"
        }
        return header + list
    }

    private fun sendWhatsappNotification(content: String) {
        try {
            Twilio.init(accountSid, authToken)
            val recipients = recipientConfig.split(",").map { it.trim() }
            recipients.forEach { number ->
                Message.creator(
                    PhoneNumber("whatsapp:$number"),
                    PhoneNumber("whatsapp:$fromNumber"),
                    content
                ).create()
                logger.info("Expiry notification sent successfully to $number")
            }
        } catch (e: Exception) {
            logger.error("Failed to send expiry notification: ${e.message}")
        }

    }
}