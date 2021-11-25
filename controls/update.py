import time
import os
import pip
from datetime import datetime
import copy, psycopg2, time, requests, sys, threading, socket, base64
import threading

# dados conexao banco de dados
db_ip = "127.0.0.1"
db_port = 5432
db_name = "SMARTBOX"
db_user = "postgres"
db_pwd = "123"

time.sleep(15)
conn = psycopg2.connect(database=db_name, user=db_user, password=db_pwd, host=db_ip, port=db_port)
conn.autocommit = True


def insertAccess():
    
    try:
        cur = conn.cursor()

        #cur.execute("ALTER TABLE controls_device ADD COLUMN block INTEGER DEFAULT 0")
        cur.execute("ALTER TABLE controls_users ADD COLUMN work_finish timestamp with time zone")
        cur.execute("ALTER TABLE controls_users ADD COLUMN  work_start timestamp with time zone")
        cur.close()

        print("COLUNA CRIADA")
    except Exception as e:
        print(e)
    
insertAccess()
