set -e

./gradlew build
docker build -t batch-processing .
docker compose down app
docker compose up app -d