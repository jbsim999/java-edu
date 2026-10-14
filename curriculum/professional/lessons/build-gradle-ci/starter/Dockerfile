# 검토용 학습 예시. 먼저 Maven package로 JAR를 만들고 이미지·플랫폼·digest를 별도 검증하세요.
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/build-gradle-ci-0.1.0.jar /app/app.jar
USER 10001:10001
ENTRYPOINT ["java","-cp","/app/app.jar","edu.lab.BuildMain"]
CMD ["2"]
