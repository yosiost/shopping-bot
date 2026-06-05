package com.myhome.shoppingbot.Config

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.servlet.HandlerInterceptor

@Component
class AuthInterceptor : HandlerInterceptor {
    override fun preHandle(request: HttpServletRequest, response: HttpServletResponse, handler: Any): Boolean {
        val path = request.requestURI

        if (!path.startsWith("/api/")) return true
        if (path.startsWith("/api/auth/") || path == "/api/config") return true

        val email = request.getSession(false)?.getAttribute("email") as? String
        if (email == null) {
            response.status = 401
            response.contentType = "application/json;charset=UTF-8"
            response.writer.write("""{"error":"Unauthorized"}""")
            return false
        }
        return true
    }
}
