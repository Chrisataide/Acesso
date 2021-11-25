from base64 import b64decode, b64encode
from json import dumps as json_dumps, loads as json_loads
from PIL import Image
from time import time, sleep 
from threading import Timer, Thread
from os import system
from sys import exc_info
from hashlib import sha1
from datetime import datetime, timedelta, date
from io import BytesIO
from subprocess import call as subprocess_call
from http import client
from requests import get as requests_get , post as requests_post, ConnectionError
from logging import DEBUG, FileHandler, Formatter, getLogger
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from controls.models import Users, Device, SmartAlarmUser, ScheduleSmta, CodeOfflineUsed
from lock.models import Lock
import face_recognition
import numpy as np
import RPi.GPIO as GPIO

# Loggin 
logger = getLogger("access")
logger.setLevel(DEBUG)
log_file_handler = FileHandler('/var/www/smartbox/access.log',encoding = "UTF-8")
log_file_handler.setFormatter(Formatter('%(asctime)s | %(levelname)s | %(message)s'))
logger.addHandler(log_file_handler)

# outputs
_outputs = [24, 26, 29, 31, 32, 12, 16]

# inputs
_inputs = [35, 36, 33, 40, 37,38]

NUMEMP_CONFIRM = []

FREE_AREA_TIMER = datetime.now()
MINUTES_TO_BLOCK_ROOM = 12
CODE_FACE_UNKNOW = 500
COACAO = False
IS_FAKE_FILE = '/var/www/smartbox/is_fake.txt'

# Verifica o ip e porta do smartaccess
try:
    device = Device.objects.latest('id')
    NAME_LOCATION = device.full_name.upper() #Localização do smart na agencia.
    SCHEDULE_PUSHBUTTON = ScheduleSmta.objects.latest("id") #Capturando programção horaria.
    IN_PUSHBUTTON_WEEKDAY = SCHEDULE_PUSHBUTTON.weekday_start_1.strftime("%H:%M") #Programção horaria inicio.
    OUT_PUSHBUTTON_WEEKDAY = SCHEDULE_PUSHBUTTON.weekday_finish_2.strftime("%H:%M") #Programção horaria final.
    IP_DEVICE = device.ip
    PORT_DEVICE = device.port
    # Configuracao BASA para alarme
    conf_alarm = device.ip.split('.')
    conf_ip = '.'.join(conf_alarm[0:3])
    generic_ip = conf_ip+'.239'
except:
    IP_DEVICE = None
    PORT_DEVICE = None

IPS_SMARTALARM = ((generic_ip, 3002), (generic_ip, 3003))


logger.info("Sistema Inicializado")
logger.info("Version 1.7.0")

def send_value(pin, value, comm_obj, data_b64, comm_type, host_ip, host_port):
    log_item_raw = " ".join([comm_obj, str(pin).zfill(2), "-", "VALUE", str(value)])

    for attempts in range(3):
        log_item = " ".join([comm_type, "-", log_item_raw])
        event_url = "".join(["http://", host_ip, ":", str(host_port), "/terminal/json/set_event/"])
        result = None

        try:
            if comm_type == 'GPRS':
                response = requests_post(url=event_url, data=json_dumps({"data":data_b64}), timeout=5)
            else:
                if attempts > 1:
                    logger.info(" ".join(["sending over", log_item]))
                response = requests_post(url=event_url, data={"data":data_b64}, timeout=5)
            if response.status_code == 200:
                # response_data = response.read()
                response_json = json_loads(response.text) if response.text else {}
                result = 'success' in response_json and response_json['success']
                if not result:
                    logger.warning(" ".join(["server rejected", log_item]))
            else:
                logger.warning(" ".join(["server error - cannot send over", log_item]))
        except Exception as ex:
            logger.warning(str(ex))

        if result:
            logger.info(" ".join(["sent over", log_item]))
            return True

        if attempts > 1:
            logger.warning(" ".join(["attempt", str(attempts + 1), log_item]))
            if attempts > 2: 
                logger.warning("".join(["no communication with the server over ", comm_type, " (", host_ip, ")."]))

    return False


def post_tcp_communication(pin, value, node, ip, port, timestamp, username):

    device = Device.objects.latest("id")
    json_dict = {'pin': pin, 'value': value, 'node': node, 'timestamp': timestamp, 'ip': ip, 'system': "SMTA", 'port': port,'username':username}
    data_json = json_dumps(json_dict)
    data_b64 = b64encode(data_json.encode('ascii'))

    return send_value( pin, value, "PIN",data_b64, "TCP", device.ip_server, device.port_server )


def free_area_block():
    try:
        global FREE_AREA_TIMER
        global MINUTES_TO_BLOCK_ROOM

        FREE_AREA_TIMER =  datetime.now() + timedelta(minutes=MINUTES_TO_BLOCK_ROOM)

        while FREE_AREA_TIMER >= datetime.now():
            sleep(1)

        data = {"id": 42, "forced": 0}
        data_json = json_dumps(data)
        data_b64 = b64encode(data_json.encode())
        try:
            requests_post(url="http://127.0.0.1:9091/lock", data=data_b64, timeout=30)
        except Exception as ex:
            _, _, exc_tb = exc_info()
            logger.error("%s - line: %s", ex, exc_tb.tb_lineno)
            sleep(0.200)

    except Exception as ex:
        _, _, exc_tb = exc_info()
        logger.error("[free_area_block]\n%s - line: %s", ex, exc_tb.tb_lineno)


thread_free_area_block = Thread(target=free_area_block)

def inputCallback(pin):
    value = GPIO.input(pin)

    global thread_free_area_block
    global FREE_AREA_TIMER
    global MINUTES_TO_BLOCK_ROOM
    global NAME_LOCATION
    global SCHEDULE_PUSHBUTTON
    global IN_PUSHBUTTON_WEEKDAY
    global OUT_PUSHBUTTON_WEEKDAY

    if pin == 36:
        if value == 0:
            #hack Ativando Bloqueio de Fechadura por Alarme Botao de Panico - Coacao"
            data = {"id": 42, "forced": 1}
            data_json = json_dumps(data)
            data_b64 = b64encode(data_json.encode())
            
            try:
                logger.info("Bloqueio por botão de panico ou Coação")
                requests_post(url="http://127.0.0.1:9091/lock", data=data_b64, timeout=30)
            
            except Exception as ex:
                _, _, exc_tb = exc_info()
                logger.error("%s - line: %s", ex, exc_tb.tb_lineno)
                sleep(0.200)

    elif pin == 33:
        if value == 1:
            if not thread_free_area_block.isAlive():
                thread_free_area_block = Thread(target=free_area_block)
                thread_free_area_block.start()
            else:
                FREE_AREA_TIMER = datetime.now() + timedelta(minutes=MINUTES_TO_BLOCK_ROOM)

    elif pin == 40:
        if value == 0:
            today = date.today()
            now = datetime.now()
            current_time = now.strftime("%H:%M")
            
            if not ('HALL' in NAME_LOCATION and today.weekday() < 5 and IN_PUSHBUTTON_WEEKDAY <= current_time <= OUT_PUSHBUTTON_WEEKDAY) :
                Thread(target=openDoor).start()

    if pin in (38, 40):  # Pinos invertidos
        value = 1 if GPIO.input(pin) == 0 else 0

    Thread(target=post_tcp_communication, args=(pin, value, 1, IP_DEVICE, PORT_DEVICE, False, "",)).start()


def setupGPIO():
    GPIO.setmode(GPIO.BOARD)
    for pin in _outputs:
        GPIO.setup(pin, GPIO.OUT)
        GPIO.output(pin, 0)  # Deixa todas as saidas desligadas
    for pin in _inputs:
        GPIO.setup(pin, GPIO.IN)
        GPIO.add_event_detect(pin, GPIO.BOTH)
        GPIO.add_event_callback(pin, inputCallback)


setupGPIO()


def remoteBlock(request):
    json_result = {}
    GPIO.output(29, 0)
    device = Device.objects.latest('id')
    Device.objects.filter(pk=device.id).update(block=1)
    json_result['success'] = True
    return JsonResponse(json_result)


@csrf_exempt
def is_block(request):

    json_result = {}
    device = Device.objects.latest('id')
    no_block = request.POST.get("no_block","")

    try:
        value_block = Device.objects.get(pk=device.id)
        json_result['success'] = value_block.block == 1 
        if no_block == 'true':
            Device.objects.filter(pk=device.id).update(block=0)
    
    except Exception as ex:
        _, _, exc_tb = exc_info()
        logger.error("%s - line: %s", ex, exc_tb.tb_lineno)
        json_result['error'] = True

    return JsonResponse(json_result)

@csrf_exempt
def open_door(request):
    Thread(target=openDoor).start()
    return JsonResponse({'success': True})

@csrf_exempt
def set_holiday(request):

    json_result = {}
    
    try:
        logger.info(request.method)

        json_result['success'] = True
    
    except Exception as e:
    
        json_result['success'] = False

    return JsonResponse(json_result)


def openDoor():
    GPIO.output(29, 1)
    GPIO.output(32, 1)
    sleep(6)
    Thread(target=return_status_door).start()


def return_status_door():
    while GPIO.input(38) == 0:
        sleep(0.5)

    sleep(1)
    GPIO.output(29, 0)
    GPIO.output(32, 0)


def index_access(request):
    try:
        device = Device.objects.latest('id')
        type_control = device.system
    except:
        type_control = 1

    context = {'type_system': 'SmartAccess', 'type_control': type_control}
    return render(request, 'index_controls.html', context)


def index_alarm(request):
    context = {'type_system': 'SmartAlarm'}
    return render(request, 'index_controls.html', context)


def check_status_smartalarm(ip, port, page):
    try:
        response = requests_get("http://%s:%s/%s" % (ip, port, page), timeout=5)
    except:
        logger.error("[check_status_smartalarm] - Placa sem comunicacao IP %s:%s", ip, str(port))
        response = False
        sleep(10)

    return response


def set_new_status_partition(ip, port, partition, status):
    try:
        response = requests_get("http://%s:%s/setPartition_%s_%s" % (ip, port, status, partition), timeout=5)
    except:
        response = False
        logger.error("[set_new_status_partition] - Placa sem comunicacao. IP %s:%s", ip, str(port))

    return response

@csrf_exempt
def set_partition(request):
    partition = int(request.POST["partition"])
    status = request.POST["status"]
    user_id = request.POST.get('user_id')
    partitions = {}
    Thread(target=thread_set_partition, args=(partition, status, user_id)).start()
    return JsonResponse(partitions)

def thread_set_partition(partition, status, user_id):
    device = Device.objects.latest("id")
    id_user = SmartAlarmUser.objects.get(pk=user_id)


    url = 'http://192.168.2.238:3001/cmd'
    data = {'':'eyJhZGRyZXNzIjoxLCJjbWQiOiJSRUxFMSIsInZhbHVlIjoxLCJkYXRlX3ZhbHVlIjpudWxsfQ=='}
    r = requests_post(url,data=json_dumps(data))
    msg = "COFRE ATIVADO"
    sleep(5)
    url = 'http://192.168.2.238:3001/cmd'
    data = {'':'eyJhZGRyZXNzIjoxLCJjbWQiOiJSRUxFMSIsInZhbHVlIjowLCJkYXRlX3ZhbHVlIjpudWxsfQ=='}
    r = requests_post(url,data=json_dumps(data))

    label = ["AGÊNCIA", "HALL-AUTO-ATENDIMENTO", "RETAGUARDA", "TESOURARIA"]
    post_data = {'id_user':id_user.user_server_id, 'device_id':device.device_server_id, 'status':status, 'location':label[partition - 1]}

    try:
        requests_post("http://%s:%s/terminal/json/arm_desarm_log/" % (device.ip_server, device.port_server), data=post_data)
    except Exception as ex:
        _, _, exc_tb = exc_info()
        logger.error("%s - line: %s", ex, exc_tb.tb_lineno)
    
    if status == "arm":
        logger.info("Iniciando contagem. Partition:%s; status:%s", partition, status)

        try:
            response = requests_get("http://%s.210:3000/disableSafe" % (str(conf_ip)), timeout=5)
            if response.status_code == 200:
                logger.info("[ GN ] HABILITADO")
        except Exception as ex:
            logger.info(ex)

        logger.info("Contagem finalizada. Partition:%s; status:%s", partition, status)
    
    for ip in IPS_SMARTALARM:
        try:
            set_new_status_partition(ip[0], ip[1], partition, status)
        except Exception as ex:
            _, _, exc_tb = exc_info()
            logger.error("%s - line: %s", ex, exc_tb.tb_lineno)


def arm_desarm_smartalarm(request):
    partitions = {}
    try:
        user = SmartAlarmUser.objects.get(pk=request.GET["user_id"])
        locations = user.location.split(',')

        for ip in IPS_SMARTALARM:
            try:
                response = check_status_smartalarm(ip[0], ip[1], 'getStatus?all')
                if response:
                    response = json_loads(response.text)
                    for partition in response['partition']:
                        partitions[int(partition)] = response['partition'][partition]
            except Exception as ex:
                _, _, exc_tb = exc_info()
                logger.error("%s - line: %s", ex, exc_tb.tb_lineno)
    
    except Exception as ex:
        _, _, exc_tb = exc_info()
        logger.error("%s - line: %s", ex, exc_tb.tb_lineno)
        return redirect('http://127.0.0.1:3333/?type_system=SmartAlarm')

    context = {'locations': locations, 'partitions': partitions}
    return render(request, 'arm_desarm_alarm.html', context)

@csrf_exempt
def get_all_status_zones(request):
    response_url = {}
    json_result = {}
    
    try:
        for ip in IPS_SMARTALARM:
            try:
                response = check_status_smartalarm(ip[0], ip[1], 'getNames?all')
                if response:
                    response_url[ip[1]] = {}
                    response_url[ip[1]] = json_loads(response.text)

                # Mescla todos as zonas dentro das particoes
                if response_url:
                    for port in response_url:
                        for partition in response_url[port]:

                            if partition not in json_result:
                            #if not partition in json_result:
                                json_result[partition] = response_url[port][partition]
                            else:
                                json_result[partition].update(response_url[port][partition])

            except Exception as ex:
                _, _, exc_tb = exc_info()
                logger.error("%s - line: %s", ex, exc_tb.tb_lineno)

    except Exception as ex:
        _, _, exc_tb = exc_info()
        logger.error("Placa não localizada\n%s - line: %s", ex, exc_tb.tb_lineno)

    return JsonResponse(json_result)


@csrf_exempt
def set_device(request):
    global IP_DEVICE
    global PORT_DEVICE
    global NAME_LOCATION

    json_result = {}
    try:

        device_exist = Device.objects.filter(device_server_id=int(request.POST['server_id'])).exists()

        NAME_LOCATION = request.POST['full_name']

        if not device_exist:
            # Delete equipamentos cadastrados anteriormente que esta com id diferentes
            Device.objects.all().delete() 

            # Deleta usuarios que estavam vinculados ao id inserido anteriormente 
            Users.objects.all().delete()

            ip_dependent = request.POST['ip_dependent'] if request.POST['ip_dependent'] != u'None' else None
            
            Device(device_server_id=int(request.POST['server_id']),
                ip_dependent=ip_dependent,
                ip_server=request.POST['ip_server'],
                port_server=request.POST['port_server'],
                ip=request.POST['ip'],
                port=request.POST['port'], 
                full_name=request.POST['full_name'], 
                system=request.POST['system'],
                uniorg=request.POST['uniorg'], 
                time_zone=request.POST['time_zone']).save()
        else:
            ip_dependent = request.POST['ip_dependent'] if request.POST['ip_dependent'] != u'None' else None
            
            Device.objects.filter(device_server_id=int(request.POST['server_id']))\
                .update(
                    ip_dependent=ip_dependent,
                    ip_server=request.POST['ip_server'], 
                    port_server=request.POST['port_server'],
                    ip = request.POST['ip'],
                    port = request.POST['port'],
                    full_name=request.POST['full_name'],
                    system=request.POST['system'],
                    uniorg=request.POST['uniorg'],
                    time_zone=request.POST['time_zone'])
        
        try:
            #todo: verificar uso da ver lock 
            lock = Lock.objects.latest("id")
            #has_lock = True if request.POST['has_lock'] != u'False' else False
            has_lock = request.POST['has_lock'] != u'False'

            data = {"enable": has_lock, "type": int(request.POST['type'])}
            data_json = json_dumps(data)
            data_b64 = b64encode(data_json.encode())
            requests_post(url="http://127.0.0.1:9091/enable_lock", data=data_b64, timeout=60)

        except Exception as ex: # Caso nao existir tabela lock criada
            _, _, exc_tb = exc_info()
            logger.error("%s - line: %s", ex, exc_tb.tb_lineno)

        # Configurando timezone
        try:
            system("/bin/cp /usr/share/zoneinfo/America/" + request.POST['time_zone'] + " /etc/localtime")
        except Exception as ex:
            _, _, exc_tb = exc_info()
            logger.error("%s - line: %s", ex, exc_tb.tb_lineno)

        device = Device.objects.latest('id')
        IP_DEVICE = device.ip
        PORT_DEVICE = device.port

        if int(request.POST['system']) != device.system:
            Timer(5, restart_system).start()

        json_result['success'] = True

    except Exception as e:
        json_result['success'] = False
        json_result['error'] = str(e)

    return JsonResponse(json_result)


def restart_system():
    system("reboot")


@csrf_exempt
def set_users(request):
    json_result = {}
    
    try:
        user_exist = Users.objects.filter(user_server_id=int(request.POST['server_id'])).exists()

        if not user_exist:
            
            Users.objects.filter(pin=request.POST['pin']).delete()

            Users(
                user_server_id=int(request.POST['server_id']), 
                full_name=request.POST['full_name'],
                job=request.POST['job'], 
                pin=str(request.POST['pin']),
                pin_coercion=str(request.POST['pin_coercion']),
                force_password_change=request.POST['force_password_change'],
                numemp=request.POST['numemp'],
                person=request.POST['type_person'],
                work_start=request.POST['work_start'],
                work_finish=request.POST['work_finish'],
                photo=request.POST['photo']
            ).save()  

        else:
            Users.objects.filter(user_server_id=int(request.POST['server_id']))\
                .update(
                    full_name=request.POST['full_name'],
                    job=request.POST['job'],pin=str(request.POST['pin']),
                    pin_coercion=str(request.POST['pin_coercion']),
                    force_password_change=request.POST['force_password_change'],
                    numemp=request.POST['numemp'],
                    person=request.POST['type_person'],
                )


        json_result['success'] = True
    except Exception as e:
        json_result['success'] = False
        json_result['error'] = str(e)

    return JsonResponse(json_result)

@csrf_exempt
def set_schedule(request):
    global IN_PUSHBUTTON_WEEKDAY
    global OUT_PUSHBUTTON_WEEKDAY

    json_result = {}
    try:
        shedule_exist = ScheduleSmta.objects.filter(schedule_id=int(request.POST['schedule_id'])).exists()

        IN_PUSHBUTTON_WEEKDAY = request.POST['weekday_start_1']
        OUT_PUSHBUTTON_WEEKDAY = request.POST['weekday_finish_2'] 

        if not shedule_exist:
            ScheduleSmta(
                schedule_id = request.POST['schedule_id'],
                weekday_start_1=request.POST['weekday_start_1'],
                weekday_finish_2=request.POST['weekday_finish_2'],
                mode_in_schedule_weekday=request.POST['mode_in_schedule_weekday'],
                mode_out_schedule_weekday=request.POST['mode_out_schedule_weekday'],
                users_door_in_schedule_weekday=request.POST['users_door_in_schedule_weekday'],
                users_door_out_schedule_weekday=request.POST['users_door_out_schedule_weekday'],
                weekend_start_1=request.POST['weekend_start_1'],
                weekend_finish_2=request.POST['weekend_finish_2'],
                mode_in_schedule_weekend=request.POST['mode_in_schedule_weekend'],
                mode_out_schedule_weekend=request.POST['mode_out_schedule_weekend'],
                users_door_in_schedule_weekend=request.POST['users_door_in_schedule_weekend'],
                users_door_out_schedule_weekend=request.POST['users_door_out_schedule_weekend']
            ).save()
        else:
            ScheduleSmta.objects.filter(
                schedule_id=int(request.POST['schedule_id'])).update(
                schedule_id = request.POST['schedule_id'],
                weekday_start_1=request.POST['weekday_start_1'],
                weekday_finish_2=request.POST['weekday_finish_2'],
                mode_in_schedule_weekday=request.POST['mode_in_schedule_weekday'],
                mode_out_schedule_weekday=request.POST['mode_out_schedule_weekday'],
                users_door_in_schedule_weekday=request.POST['users_door_in_schedule_weekday'],
                users_door_out_schedule_weekday=request.POST['users_door_out_schedule_weekday'],
                weekend_start_1=request.POST['weekend_start_1'],
                weekend_finish_2=request.POST['weekend_finish_2'],
                mode_in_schedule_weekend=request.POST['mode_in_schedule_weekend'],
                mode_out_schedule_weekend=request.POST['mode_out_schedule_weekend'],
                users_door_in_schedule_weekend=request.POST['users_door_in_schedule_weekend'],
                users_door_out_schedule_weekend=request.POST['users_door_out_schedule_weekend']
            )
        json_result['success'] = True
    except Exception as e:
        json_result['success'] = False
        json_result['error'] = str(e)

    return JsonResponse(json_result)


@csrf_exempt
def lock_alter_user(request):
    json_result = {}
    try:
        data = {"id": request.POST['id'], "lock_id": request.POST['lock_id'], "user_id": request.POST['user_id'], "type": request.POST['type']}
        data_json = json_dumps(data)
        data_b64 = b64encode(data_json.encode())

        response = requests_post(url="http://127.0.0.1:9091/%s_user" % (request.POST['action']), data=data_b64, timeout=60)
        response = json_loads(response.text)
        json_result['success'] = response
    except Exception as e:
        json_result['success'] = False
        json_result['error'] = str(e)

    return JsonResponse(json_result)

@csrf_exempt
def lock_action(request):
    json_result = {}
    try:
        data = {"id": request.POST['id'], "forced": request.POST['forced']}
        data_json = json_dumps(data)
        data_b64 = b64encode(data_json.encode())

        response = requests_post(url="http://127.0.0.1:9091/%s" % (request.POST['action']), data=data_b64, timeout=60)
        response = json_loads(response.text)
        json_result['success'] = response
    except Exception as e:
        json_result['success'] = False
        json_result['error'] = str(e)

    return JsonResponse(json_result)


@csrf_exempt
def delete_users(request, id):
    json_result = {}
    user_server_id = request.POST['id']
    user_obj = get_object_or_404(Users,user_server_id=str(user_server_id))
    user_obj.delete()    
    return HttpResponse(json_result)


@csrf_exempt
def delete_users_alarm(request):
    json_result = {}
    try:
        SmartAlarmUser.objects.filter(pin=request.POST['pin']).delete()
    except Exception as e:
        json_result['success'] = False
        json_result['error'] = str(e)

    return JsonResponse(json_result)

def handle_uploaded_file(f, pin):
    with open(settings.BASE_DIR + "/media/" + str(pin) + ".jpg", "wb+") as destination:
        for chunk in f.chunks():
            destination.write(chunk)


@csrf_exempt
def set_smartalarm_user(request):
    json_result = {}
    try:
        user_exist = SmartAlarmUser.objects.filter(user_server_id=int(request.POST['server_id'])).exists()
        if not user_exist:
            SmartAlarmUser.objects.filter(pin=request.POST['pin']).delete()
            SmartAlarmUser( user_server_id=int(request.POST['server_id']), 
                            full_name=request.POST['full_name'],
                            job=request.POST['job'],
                            pin=str(request.POST['pin']), pin_coercion=str(request.POST['pin_coercion']),
                            location=request.POST['location'],
                            force_password_change=request.POST['force_password_change']
            ).save()
        else:
            SmartAlarmUser.objects.filter(user_server_id=int(request.POST['server_id'])).update(
                full_name=request.POST['full_name'],
                job=request.POST['job'],
                pin=str(request.POST['pin']),
                pin_coercion=str(request.POST['pin_coercion']),
                location=request.POST['location'],
                force_password_change=request.POST['force_password_change'])

        json_result['success'] = True
    except Exception as e:
        json_result['success'] = False
        json_result['error'] = str(e)

    return JsonResponse(json_result)

def delay_coacao():
    global COACAO
    COACAO = False

def lock_coation():

    data = {"id": 42, "forced": 1}
    data_json = json_dumps(data)
    data_b64 = b64encode(data_json.encode())
    count = 0

    while count <= 6:
        try:
            req = json_loads(requests_post(url="http://127.0.0.1:9091/lock", data=data_b64, timeout=30).text)

            if req:
                break
            
            sleep(6)
        except Exception as ex:
            _, _, exc_tb = exc_info()
            logger.error("[lock_coation] - Erro unlock_lock\n%s - line: %s", ex, exc_tb.tb_lineno)
            sleep(6)

        count = count + 1


def send_event_access(post_data_value, device):
    count = 0
    while count <= 6:
        try:
            post_data = post_data_value
            data_json = json_dumps(post_data)
            data_b64 = b64encode(data_json.encode())
            
            requests_post(  url="http://{host_ip_server}:{host_port_server}/terminal/json/set_event/".format(host_ip_server=device.ip_server, host_port_server=device.port_server), 
                            data={"data": data_b64}, 
                            timeout=60)
            break
        except Exception as ex:
            _, _, exc_tb = exc_info()
            logger.error("[send_event_access] - Erro ao enviar status de acesso ao servidor\n%s - line: %s", ex, exc_tb.tb_lineno)
            count = count + 1
            sleep(5)


def generete_code_offline(uniorg, pin, ip):
    validate = False

    dttime = datetime.now().strftime('%Y-%m-%d %H:%M')
    date_now = dttime.split(' ')[0]
    time_now = dttime.split(' ')[1]
    mounth = date_now.split('-')[1]
    day = date_now.split('-')[2]
    hour = time_now.split(':')[0]
    minute = time_now.split(':')[1]
    code_ip = ip.split('.')[3]

    code = str(minute + hour + code_ip[0:1] + mounth[1:] + uniorg[6:])
    random_code = str(code[4:5] + code[5:6])
    random_pin = str(pin[2:3] + pin[4:5])

    code_used = CodeOfflineUsed.objects.filter(code=pin).exists()


    if not code_used:
        if random_code == random_pin:
            validate = "OFFLINE"

            try:
                response = requests_get("http://%s.210:3000/enableSafe" % (str(conf_ip)), timeout=5)
                if response.status_code == 200:
                    logger.info("[ GN ] DESABILITADO ")
            except Exception as ex:
                logger.info(ex)
    else:
        logger.info("Offline incorreto")

    return validate


def check_file_isfake():
    is_fake = False    
    try:
        open(IS_FAKE_FILE, "r")
        is_fake = True

    except Exception as ex:
        _, _, exc_tb = exc_info()
        logger.error("[check_file_isfake]\n%s - line: %s", ex, exc_tb.tb_lineno)
    return is_fake


# @csrf_exempt
# def simple_custody(pin,server_id):
#     post_data = {"pin_user": pin, "device_id": server_id,"simples":"simples"}
#     try:
#             requests_post("http://%s:%s/terminal/json/request_access/" % (device.ip_server, device.port_server), data=post_data)
#     except:
#         pass


def control_schedule():
    inside_schedule_weekday = None
    outside_shedule_weekday = None
    mode = None
    count_user = None
    
    schedule = ScheduleSmta.objects.latest("id")

    try:
        today = date.today()
        now = datetime.now()
        current_time = now.strftime("%H:%M")

        in_schedule_weekday = schedule.weekday_start_1.strftime("%H:%M")
        out_schedule_weekday = schedule.weekday_finish_2.strftime("%H:%M")
        in_schedule_weekend = schedule.weekend_start_1.strftime("%H:%M")
        out_schedule_weekend = schedule.weekend_finish_2.strftime("%H:%M")

        if today.weekday() < 5:
            if current_time >= in_schedule_weekday and current_time <=  out_schedule_weekday:
                inside_schedule_weekday = True
                mode = schedule.mode_in_schedule_weekday
                count_user = schedule.users_door_in_schedule_weekday
            else:  
                inside_schedule_weekday = False
                mode = schedule.mode_out_schedule_weekday
                count_user = schedule.users_door_out_schedule_weekday
        else:
            if current_time >= in_schedule_weekend and current_time <= out_schedule_weekend:
                outside_shedule_weekday = True
                mode = schedule.mode_in_schedule_weekend
                count_user = schedule.users_door_in_schedule_weekend
            else:  
                outside_shedule_weekday = False
                mode = schedule.mode_out_schedule_weekend
                count_user = schedule.users_door_out_schedule_weekend
        
    except Exception as ex:
        _, _, exc_tb = exc_info()
        logger.error("[control_schedule]\n%s - line: %s", ex, exc_tb.tb_lineno)

    return inside_schedule_weekday, outside_shedule_weekday, count_user,mode

@csrf_exempt
def confirm_auth(request):
    global COACAO
    global NUMEMP_CONFIRM
    
    """
    Mode 0 = Dupla Custodia
    Mode 1 = Simples Custodia
    :param request:
    :return:
    """

    try:
        json_result = {}
        post_data = {}
        pin = request.POST["pin"]
        dupla = str(request.POST.get("dupla",""))
        pin_len = len(pin)
        device = Device.objects.latest("id")
        
        post_data = {"ip": device.ip, "port": device.port, "system": "SMTA", "pin": 86, "value": 0, "timestamp": False, "username": " "}

        if pin_len > 6:  # Coercion
            pin_auth = Users.objects.get(pin_coercion=pin)
            json_result["coercion"] = True
            json_result["pin_user"] = pin_auth.pin_coercion
            ip = device.ip
            port = device.port
            Thread(target=post_tcp_communication, args=(100, 1, 1, ip, port, False,pin_auth.full_name,)).start()
            logger.info(" ".join(["[SMART ACCESS ] Usuario : ", str(pin_auth.full_name),"em COAÇÃO"]))
            Timer(20, post_tcp_communication, [100, 0, 1, ip, port, False,pin_auth.full_name,]).start()
            COACAO = True

            # Bloquear Fechadura.
            Thread(target=lock_coation).start()
            Timer(20, delay_coacao).start()
        else:
            pin_auth = Users.objects.get(pin=pin)
            json_result["coercion"] = False
            json_result["pin_user"] = pin_auth.pin


        if pin_auth:
            result = control_schedule()
            inside_schedule_weekday = result[0]
            outside_shedule_weekday = result[1]
            count_user = result[2]
            mode = result[3]
            
            if not pin_auth == 'OFFLINE':
                json_result["name"] = pin_auth.full_name.split(" ")[0].upper()
                json_result["mode"] = mode
                known_face, face_locations = faceRecognized(pin[:6])

            is_fake = check_file_isfake()
            is_fake = False

            if known_face == CODE_FACE_UNKNOW: # 500 = Foto nao encontrada
                logger.info("Cadastrando Biometria")
                json_result["pass"] = "correctPass"
                json_result["picture"] = CODE_FACE_UNKNOW
                json_result["access"] = "accessDenied"
                json_result["user_id"] = pin_auth.id

            # logger.info(known_face)

            elif known_face and not is_fake and not pin_auth.person == '3' :  # Ativado
                numemp = str(pin_auth.numemp)
                NUMEMP_CONFIRM.append(numemp)
                if dupla == count_user or count_user == '1':
                    if mode == 1 and (inside_schedule_weekday == True or inside_schedule_weekday == False or outside_shedule_weekday == True or outside_shedule_weekday == False ):
                        try:
                            if not pin_auth.force_password_change:
                                Thread(target=openDoor).start()
                                access_log(pin,device,"SIMPLES CUSTODIA")
                                logger.info("Acesso Autorizado")
                           
                            NUMEMP_CONFIRM = []
                                
                            # Coletar Matricula do Usuário
                            numemp = str(pin_auth.numemp)
                            username = pin_auth.full_name
                            
                            post_data = {'ip': device.ip, 'port': device.port, 'system':"SMTA", 'pin': 87, 'value':0, 'timestamp':False, 'username' : username}
                            Thread(target=send_event_access, args=(post_data,device,)).start()
                        except Exception as ex:
                            _, _, exc_tb = exc_info()
                            logger.error("[control_schedule]\n%s - line: %s", ex, exc_tb.tb_lineno)

                    json_result["pass"] = "correctPass"
                    json_result["access"] = "accessAllow"
                    json_result["picture"] = "pictureFound"
                    json_result["force_password_change"] = pin_auth.force_password_change
                    json_result["pin"] = pin[:6]
                elif count_user > '1' :
                    json_result["permisison"] = pin_auth.person
                    json_result["dupla"] = "dupla2"
                    json_result["pass"] = "correctPass"
                    json_result["access"] = "accessAllow"
                    json_result["picture"] = "pictureFound"
                    json_result["force_password_change"] = pin_auth.force_password_change
                    json_result["pin"] = pin[:6]
                else:
                    json_result["pass"] = "correctPass"
                    json_result["picture"] = "pictureNotFound"
                    json_result["access"] = "accessDenied"

            elif known_face and pin_auth.person == '3':

                    today = date.today()
                    now = datetime.utcnow()
                    current_time = now.strftime("'%d-%m-%Y' %H:%M")
                    
                    start = pin_auth.work_start.strftime("'%d-%m-%Y' %H:%M")
                    end = pin_auth.work_finish.strftime("'%d-%m-%Y' %H:%M")
                    
                    logger.info(current_time)
                    logger.info(start)
                    logger.info(end)
                    if current_time >= start and current_time <= end:
                        json_result["pass"] = "others"
                        json_result["schedule_others"] = "in"
                        logger.info('dentro horario')
                        post_data = {"pin_user": pin_auth.pin, "device_id": device.device_server_id,}
                        try:
                            requests_post("http://%s:%s/terminal/json/people_access/" % (device.ip_server, device.port_server), data=post_data)
                        except Exception as e:
                            print(e)
                    else:
                        json_result["pass"] = "others"
                        json_result["schedule_others"] = "out"
                        logger.info('fora horario')


            else:
                logger.info("Biometria nao localizada")
                json_result["pass"] = "correctPass"
                json_result["picture"] = "pictureNotFound"
                json_result["access"] = "accessDenied"
                json_result["user_id"] = pin_auth.id
                json_result["force_password_change"] = pin_auth.force_password_change
        else:
            json_result["pass"] = "incorrectPass"
            # Thread(target=send_event_access, args=(post_data, device,)).start()
            if not pin == "offline":
                Thread(target=send_event_access, args=(post_data, device,)).start()
    except Exception as ex:
        _, _, exc_tb = exc_info()
        logger.error("[confirm_auth]\n%s - line: %s", ex, exc_tb.tb_lineno)
        
        json_result["pass"] = "incorrectPass"
        if post_data:
            Thread(target=send_event_access, args=(post_data, device,)).start()
    return JsonResponse(json_result)


@csrf_exempt
def confirm_auth_smartalarm(request):
    global COACAO
    """
    Mode 0 = Dupla Custodia
    Mode 1 = Simples Custodia
    :param request:
    :return:
    """
    try:
        json_result = {}
        pin = request.POST["pin"]
        pin_len = len(pin)
        device = Device.objects.latest("id")
        post_data = {'ip': device.ip, 'port': device.port, 'system': "SMTA", 'pin': 86, 'value': 0, 'timestamp': False, 'username': ""}

        if pin_len > 6:  # Coercion
            pin_auth = SmartAlarmUser.objects.get(pin_coercion=pin)
            json_result["coercion"] = True
            json_result["pin_user"] = pin_auth.pin_coercion
            ip = device.ip
            port = device.port
            Thread(target=post_tcp_communication, args=(100, 1, 1, ip, port, False,pin_auth.full_name,)).start()
            logger.info(" ".join(["[SMART ALARM ] Usuario :", str(pin_auth.full_name),"em COAÇÃO"]))
            Timer(20, post_tcp_communication, [100, 0, 1, ip, port, False,pin_auth.full_name,]).start()
            COACAO = True

            Thread(target=lock_coation).start()
            Timer(20, delay_coacao).start()
        else:
            pin_auth = SmartAlarmUser.objects.get(pin=pin)
            json_result["coercion"] = False
            json_result["pin_user"] = pin_auth.pin

        if pin_auth:
            json_result["name"] = pin_auth.full_name.split(" ")[0].upper()
            json_result["pass"] = "correctPass"
            json_result["user_id"] = pin_auth.id
            json_result["force_password_change"] = pin_auth.force_password_change
            json_result["pin"] = pin[:6]
            post_data = {"ip": device.ip, "port": device.port, "system": "SMTA", "pin": 87, "value": 0, "timestamp": False, "username": pin_auth.full_name}
            Thread(target=send_event_access, args=(post_data, device,)).start()
            logger.info("Acesso Autorizado")
        else:
            json_result["pass"] = "incorrectPass"
            Thread(target=send_event_access, args=(post_data, device,)).start()

    except Exception as ex:
        _, _, exc_tb = exc_info()
        logger.error("[confirm_auth_smartalarm]\n%s - line: %s", ex, exc_tb.tb_lineno)
        json_result["pass"] = "incorrectPass"
        Thread(target=send_event_access, args=(post_data, device,)).start()
    
    return JsonResponse(json_result)

@csrf_exempt
def alter_pass(request):
    json_result = {}
    old_pin = request.POST["old_pin"]
    new_pin = request.POST["new_pin"]
    system = request.POST["system"]
    device = Device.objects.latest("id")
    device_ip = device.device_server_id

    if system == 'SmartAccess' :
        select_user = Users.objects.get(pin=old_pin)
    else:
        select_user = SmartAlarmUser.objects.get(pin=old_pin)

    id_user_server = select_user.user_server_id
    post_data = {"old_pin": old_pin, "new_pin":new_pin, "system": system,"id_user_server":id_user_server,"device_ip":device_ip}

    try:
        response = requests_post("http://%s:%s/terminal/json/alter_pass_access/" % (device.ip_server, device.port_server), timeout=30, data=post_data)
        json_result = json_loads(response.text)
        if json_result["response"] != "duplicate" and json_result["response"]:
            if system == 'SmartAccess':
                user = Users.objects.get(pin=old_pin)
                user.pin = new_pin
                user.pin_coercion = str(new_pin) + str(user.pin_coercion)[-1]
                user.force_password_change = False
                user.save()
                post_data = {"ip": device.ip, "port": device.port, "system": "SMTA", "pin": 90, "value": 0, "timestamp": False, "username": user.full_name}
                Thread(target=send_event_access, args=(post_data, device,)).start()
                logger.info("[SMART ACCESS ] Senha usuario : %s alterado com sucesso ",user.full_name)
            
            else:
                user_alarm = SmartAlarmUser.objects.get(pin=old_pin)
                user_alarm.pin = new_pin
                user_alarm.pin_coercion = str(new_pin) + str(user_alarm.pin_coercion)[-1]
                user_alarm.force_password_change = False
                user_alarm.save()
                post_data = {"ip": device.ip, "port": device.port, "system": "SMTA", "pin": 90, "value": 0, "timestamp": False, "username": user_alarm.full_name}
                Thread(target=send_event_access, args=(post_data, device,)).start()
                logger.info("[SMART ALARM ] Senha usuario : %s alterado com sucesso ",user_alarm.full_name)


    except Exception as ex:
        _, _, exc_tb = exc_info()
        logger.info(ex)
        logger.error("[alter_pass]\n%s - line: %s", ex, exc_tb.tb_lineno)
        json_result["response"] = False

    return JsonResponse(json_result)

@csrf_exempt
def request_access(request):

    pin_user = request.POST["pin_user"]
    dupla = str(request.POST.get("dupla",""))
    device = Device.objects.latest("id")
    schedule = ScheduleSmta.objects.latest("id")

    today = date.today()
    now = datetime.now()
    current_time = now.strftime("%H:%M")

    in_schedule_weekday = schedule.weekday_start_1.strftime("%H:%M")
    out_schedule_weekday = schedule.weekday_finish_2.strftime("%H:%M")
    in_schedule_weekend = schedule.weekend_start_1.strftime("%H:%M")
    out_schedule_weekend = schedule.weekend_finish_2.strftime("%H:%M")

    if today.weekday() < 5:
        if current_time >= in_schedule_weekday and current_time <=  out_schedule_weekday:
            count_user = schedule.users_door_in_schedule_weekday
        else:  
            count_user = schedule.users_door_out_schedule_weekday
    else:
        if current_time >= in_schedule_weekend and current_time <= out_schedule_weekend:
            count_user = schedule.users_door_in_schedule_weekend
        else:  
            count_user = schedule.users_door_out_schedule_weekend

    post_data = {'pin_user' : pin_user, 'device_id' : device.device_server_id}
    try:
        response = requests_post("http://%s:%s/terminal/json/request_access/" % (device.ip_server, device.port_server), timeout=60, data=post_data)
        json_result = json_loads(response.text)
        logger.info(response.text)
        if json_result["response"] == "allow":
            if dupla == count_user or count_user == '1':
                logger.info("Acesso Autorizado")
                
                try:
                    response = requests_get("http://%s.210:3000/enableSafe" % (str(conf_ip)), timeout=5)
                    logger.info(response)
                    if response.status_code == 200:
                        logger.info("[ GN ] DESABILITADO")

                except Exception as ex:
                    logger.info(ex)

                Thread(target=openDoor).start()
            elif count_user > '1' :
                json_result["pin_user"] = pin_user
                json_result["dupla"] = "dupla2"
                json_result["pass"] = "correctPass"
                json_result["access"] = "accessAllow"
                json_result["picture"] = "pictureFound"

    except Exception as ex:
        json_result = {}
        _, _, exc_tb = exc_info()
        logger.error("[request_access]\n%s - line: %s", ex, exc_tb.tb_lineno)
        json_result["response"] = "error"
        sleep(5)

    return JsonResponse(json_result)


@csrf_exempt
def set_enable_system(request):
    json_result = {}
    json_result["response"] = True
    Users(user_server_id=0, full_name="Ativacao do sistema", job="Server", pin=0000000000, pin_coercion=0000000000).save()
    return JsonResponse(json_result)


@csrf_exempt
def get_status_smartalarm(request):
    """
    Verifica se o ambiente esta armado ou desarmado
    Normalmente sao 4 ambientes (HALL, TESOURARIA, RETAGUARDA, AGENCIA)
    :param request:
    :return:
    """
    json_result = {}
    IPS = (('192.168.3.211', '3002'), ('192.168.3.212', '3003'), ('192.168.3.213', '3004'), ('192.168.3.214', '3005'))
    for ip in IPS:
        requests_get("http://%s:%s/getStatusArea/" % (ip[0], ip[1]), timeout=5)

    return JsonResponse(json_result)


@csrf_exempt
def check_enable_system(request):
    json_result = {}
    try:
        device = Device.objects.latest("id")
        if device.system == 0:
            response = requests_get("http://%s:3000/getStatus?all_1" % (device.ip_dependent,), timeout=5)
            response = json_loads(response.text)
            if response["86"] == 0:  # Ativado
                json_result["response"] = True
            else:
                json_result["response"] = False
            json_result["system"] = device.system
    except (ConnectionError, client.BadStatusLine):
        json_result["response"] = "fail"
        json_result["system"] = 0
    except:
        json_result["response"] = "fail"
        json_result["system"] = False

    return JsonResponse(json_result)


@csrf_exempt
def check_status(request):
    status = {}

    try:
        Device.objects.latest('id')
        device_exists = True
    except:
        device_exists = False

    if device_exists:
        for pin in (_inputs + _outputs):
            if pin in (38, 40): # Pinos invertidos
                status[pin] = 1 if GPIO.input(pin) == 0 else 0
            else:
                status[pin] = GPIO.input(pin)

        if COACAO:
            status["100"] = 1
        else:
            status["100"] = 0

        status["system"] = "SMTA"
        status["version"] = "1.7.0"

        status[31] = GPIO.input(29)   

    return JsonResponse(status)

@csrf_exempt
def check_connection(request):
    status = False

    try:
        device = Device.objects.latest('id')
        device_exists = True
    except:
        device_exists = False

    if device_exists:
        res = subprocess_call(['ping', '-c', '3', device.ip_server])
        if res == 0:
            status = True

    return JsonResponse(status, safe=False)


def capture_img_motioneye():
    cam = int(1)
    password = sha1('atk130'.encode('utf-8')).hexdigest()
    timestamp = int(time() * 1000.0)
    path = '/picture/1/current/?_=' + str(timestamp) + '&_username=admin'

    signature = computeSignature('GET', path, password)
    url = 'http://127.0.0.1:8765/picture/' + str(cam) + '/current/?_=' + str(timestamp) + '&_username=admin&_signature=' + signature

    return Image.open(requests_get(url, stream=True).raw)

def computeSignature(method, path, password):
    return sha1((method + ':' + path + '::' + password).encode('utf-8')).hexdigest().lower()


def capture_save(request):
    pin = request.GET['pin']
    json_result = {'success':{}}

    img_pin = Users.objects.filter(pin=pin)[0]

    try:
        img = capture_img_motioneye()
        img.save("/tmp/tmp.jpg")
        image = face_recognition.load_image_file("/tmp/tmp.jpg")
        img.thumbnail((240, 320), Image.ANTIALIAS)
        face_locations = []
        output = np.array(img)
        face_locations = face_recognition.face_locations(output)

        stream = BytesIO()

        img.save(stream,format="JPEG")
        imgBytes = stream.getvalue()

        if len(face_locations) == 1 :
            img_pin.photo =  b64encode(bytes(imgBytes))
            img_pin.save()
            system('rm /tmp/tmp.jpg')
            json_result['success'] = True
            logger.info('Biometria Cadastrada')
        else:
            json_result['success'] = "no_face"

    except Exception as ex:
        json_result['success'] = False
        _, _, exc_tb = exc_info()
        logger.error("[capture_save]\n%s - line: %s", ex, exc_tb.tb_lineno)


    return JsonResponse(json_result)


def faceRecognized(pin):
    known_face = False
    img_pin = Users.objects.get(pin=pin)

    try:
        logger.info("Reconhecendo Biometria")
        device = Device.objects.latest("id")
        img_decode = b64decode(bytes(img_pin.photo,'utf-8'))
        img = BytesIO(img_decode)
        image = face_recognition.load_image_file(img)
        image_face_encoding = face_recognition.face_encodings(image)[0]
    except Exception as ex:
        _, _, exc_tb = exc_info()
        logger.error("[faceRecognized]\n%s - line: %s", ex, exc_tb.tb_lineno)
        return CODE_FACE_UNKNOW, False

    img = capture_img_motioneye()
    img.thumbnail((240, 320), Image.ANTIALIAS)
    face_locations = []
    face_encodings = []
    output = np.array(img)
    face_locations = face_recognition.face_locations(output)

    if len(face_locations) == 0:
        post_data = {'ip': device.ip, 'port': device.port, 'system': "SMTA", 'pin': 88, 'value': 0, 'timestamp': False, 'username': ""}
        Thread(target=send_event_access, args=(post_data, device,)).start()

    face_encodings = face_recognition.face_encodings(output, face_locations)
    
    logger.info("Processando Biometria...")
    
    if face_encodings:

        for face_encoding in face_encodings:
            match = face_recognition.compare_faces([image_face_encoding], face_encoding)
            if match[0]:
                known_face = True

        if not known_face:
            post_data = {'ip': device.ip, 'port': device.port, 'system': "SMTA", 'pin': 89, 'value': 0, 'timestamp': False, 'username': ""}
            Thread(target=send_event_access, args=(post_data, device,)).start()
        
        return known_face, len(face_locations)

    return False, 0


@csrf_exempt
def hour_date(request):
    json_result = {}
    try:
        now = datetime.now()
        hora = now.strftime("%H")
        minuto = now.strftime("%M")
        json_result["hora"] = hora
        json_result["minuto"] = minuto
        json_result['success'] = True
    
    except:
        json_result['success'] = False

    return JsonResponse(json_result)

@csrf_exempt
def confirm_password(request):

    json_result = {}
    result = control_schedule()
    count_user = result[2]
    mode = result[3]
    request_permission = str(request.POST.get("request_permission",""))
    device = Device.objects.latest("id")

    try:
        pin = request.POST["pin"]
        type_system = request.POST["system"]
        pin_len = len(pin)
        accessibility_port = str(request.POST.get("accessibility_port",""))

        if type_system == "SmartAccess":
            if pin_len == 8:
                pin_auth = generete_code_offline(device.uniorg, pin, device.ip)
                logger.info("Code Offline")
            elif pin_len == 7:
                pin_auth = Users.objects.get(pin_coercion=pin)
            else:
                pin_auth = Users.objects.get(pin=pin)

            #post_data = {"pin_user": pin_auth.pin, "device_id": device.device_server_id,}
            #try:
            #    requests_post("http://%s:%s/terminal/json/people_access/" % (device.ip_server, device.port_server), data=post_data)
            #except Exception as e:
            #    print(e)

            if pin_auth == "OFFLINE":
                json_result["pass"] = "OFFLINE"
                Thread(target=openDoor).start()
                logger.info("Abertura Offline")
                CodeOfflineUsed(code=pin).save()
            elif pin_auth and accessibility_port == 'true' :
                json_result["pass"] = "correctAccessibility"
                access_log(pin,device,"TECLADO INTERNO")
                logger.info("[TECLADO] Porta Aberta")
                Thread(target=openDoor).start()
            elif pin_auth and pin_auth.photo is None :
                json_result["pass"] = "correctPass"

            elif pin_auth and pin_auth.person == '3':
                json_result["pass"] = "correctPass"

            elif    (pin_auth and request_permission == 'first_registration') or \
                    (pin_auth and pin_auth.person == '0' and not request_permission == "true") or \
                    (pin_auth and pin_auth.person == '1' and request_permission == "true"):
                json_result["permission"] = pin_auth.person 
                json_result["pass"] = "correctPass"
                # if  count_user > '1' and mode == 1:
                    # simple_custody(pin,device.device_server_id)
            elif pin_auth and pin_auth.person == '1' or pin_auth and pin_auth.person == '0' and request_permission == "true":
                json_result["access"] = "accessDenied"
            else:
                json_result["pass"] = "incorrectPass"

        else:
            if pin_len == 7:
                pin_auth = SmartAlarmUser.objects.get(pin_coercion=pin)
                json_result["pass"] = "correctPass"
                logger.info("Acesso Autorizado")
            else:
                pin_auth = SmartAlarmUser.objects.get(pin=pin)
                json_result["pass"] = "correctPass"
    
    except Exception as e:
        logger.info("Senha incorreta")
        json_result['error'] = str(e)

    return JsonResponse(json_result)


def access_log(pin,device,action):

    id_user = Users.objects.get(pin=pin)
    post_data = {"id_user":id_user.user_server_id,"device_id": device.device_server_id,"action":action}
    
    try:
        response = requests_post("http://%s:%s/terminal/json/smart_access_log/" % (device.ip_server,device.port_server),data=post_data)
    except Exception as e:
        logger.info(e)
