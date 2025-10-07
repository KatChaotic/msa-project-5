from airflow.sdk import dag, task, chain
from datetime import datetime, timedelta
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.operators.email import EmailOperator
import csv
import os
import random

@dag(
    start_date=datetime(2025, 10, 5),
    schedule=None,
    catchup=False,
    tags=['practicum']
)
def simple_dag():
    @task()
    def read_csv_file(file):
        csv_path = f"/opt/data/files/{file}"

        print(f"Пробуем прочитать файл по пути {csv_path}")
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"Файл {csv_path} не найден")
        
        with open(csv_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)

            rows = []
            for row_num, row in enumerate(csv_reader, 1):
                print(f"Строка #{row_num}: {dict(row)}")
                rows.append(row)

            return rows

    @task(
        retries=3,
        retry_delay=3,
        email_on_failure=True,
        email='katchaotic@yandex.ru'
    )
    def random_task():
        roll = random.randint(1, 20)

        if roll <= 10:
            raise Exception(f"Непредвиденная ошибка, случилось то, что случилось ({roll})")

        return roll

    @task
    def load_users():
        hook = PostgresHook(postgres_conn_id='app_postgres')
        users = hook.get_df("SELECT * FROM users")
        return users

    @task
    def load_goods():
        hook = PostgresHook(postgres_conn_id='app_postgres')
        goods = hook.get_df("SELECT * FROM goods")
        return goods

    @task()
    def merge_all_together(orders, payments, users, goods):
        merged = []
        for order in orders:
            for payment in payments:
                if order['order_id'] == payment['order_id']:
                    merged_order = {**order}

                    merged_order['user'] = users[users['id'] == int(merged_order['user_id'])].to_dict('records')[0]

                    merged_order['date'] = datetime.strptime(merged_order['date'], '%Y-%m-%d').date()

                    merged_order['payment'] = payment
                    merged_order['payment']['amount'] = float(merged_order['payment']['amount'])

                    good_ids = merged_order['good_ids'].split(',')
                    good_ids = list(map(int, good_ids))

                    merged_order['goods'] = goods[goods['id'].isin(good_ids)].to_dict('records')

                    del merged_order['good_ids']
                    merged.append(merged_order)
                    

        for row_num, row in enumerate(merged, 1):
            print(f"Строка #{row_num}: {dict(row)}")

        return merged

    @task()
    def get_failed_orders(merged_data):
        failed_orders = []
        for order in merged_data:
            if order['payment']['status'] == 'failed':
                failed_orders.append(order)

        return failed_orders

    @task.branch
    def when_has_failed_orders(ti=None):
        failed_orders = ti.xcom_pull(task_ids="get_failed_orders")
        if len(failed_orders) > 0:
            print(f"Есть неоплаченные заказы: {len(failed_orders)}")
            return 'notify_about_failed_orders'
        
        return None

    notify_about_failed_orders = EmailOperator(
        task_id="notify_about_failed_orders",
        to="katchaotic@yandex.ru",
        subject="Внимание: неудачная оплата заказов",
        html_content="""
        <h1>Уведомление о проблеме</h1>
        <p>Оплаты с ошибками: {{ ti.xcom_pull(task_ids='get_failed_orders')|length }}</p>
        """,
    )

    orders = read_csv_file.override(task_id='read_orders')('orders.csv')
    payments = read_csv_file.override(task_id='read_payments')('payments.csv')
    roll_result = random_task()

    users = load_users()
    goods = load_goods()

    merged_data = merge_all_together(orders, payments, users, goods)

    failed_orders = get_failed_orders(merged_data)

    branch_result = when_has_failed_orders()

    chain(failed_orders, branch_result, [ notify_about_failed_orders ])

simple_dag()