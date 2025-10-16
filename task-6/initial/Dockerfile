FROM openjdk:24-slim

WORKDIR /opt/app

COPY src/agents/jmx_prometheus_javaagent-1.5.0.jar jmx_prometheus_javaagent.jar
COPY src/exporter.yml exporter.yml
COPY build/libs/*.jar app.jar

EXPOSE 8080
EXPOSE 8081

ENTRYPOINT [ "java", "-javaagent:jmx_prometheus_javaagent.jar=8080:exporter.yml", "-jar", "app.jar" ]