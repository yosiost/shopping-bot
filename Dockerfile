# Step 1: Build the application
FROM eclipse-temurin:21-jdk-jammy AS build
COPY . .
RUN ./gradlew clean build -x test

# Step 2: Run the application
FROM eclipse-temurin:21-jre-jammy
COPY --from=build /build/libs/shopping-bot-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]