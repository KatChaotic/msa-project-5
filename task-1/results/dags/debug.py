from airflow.sdk import dag, task
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

@dag(
    schedule=None,  # Отключаем расписание для ручного запуска
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['practicum']
)
def debug_dag():
    
    @task
    def simple_test():
        logger.info("=== НАЧАЛО ВЫПОЛНЕНИЯ ЗАДАЧИ ===")
        
        # Простая операция для проверки работы Celery
        result = {"status": "success", "message": "Тестовая задача выполнена"}
        
        logger.info("=== ЗАДАЧА УСПЕШНО ЗАВЕРШЕНА ===")
        return result
    
    simple_test()

debug_dag()