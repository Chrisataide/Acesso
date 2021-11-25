from __future__ import unicode_literals

from django.db import models
from django.core.validators import validate_comma_separated_integer_list

# Create your models here.
class Users(models.Model):
    PROFILE = ((0, "ADMIN"), (1, "OPERATOR"))
    user_server_id = models.IntegerField()
    full_name = models.CharField(max_length=100)
    job = models.CharField(max_length=100)
    pin = models.CharField(max_length=6, default=0, verbose_name=u'Pin', unique=True,
                           error_messages={'unique': u"Esse n\xfamero de Pin j\xe1 foi cadastrado."})
    pin_coercion = models.CharField(max_length=7, default=0, verbose_name=u'Pin Coa\xe7\xe3o', unique=True,
                                    error_messages={
                                        'unique': u"Esse n\xfamero de Pin coa\xe7\xe3o j\xe1 foi cadastrado."})
    profile = models.IntegerField(choices=PROFILE, default=0)
    force_password_change = models.BooleanField(default=False, verbose_name=u'Mudar Pin')
    systems = models.CharField(validators=[validate_comma_separated_integer_list], max_length=100, default='')
    numemp = models.CharField(max_length=8, null=True, blank=True)
    photo = models.TextField(max_length=20,default="",verbose_name='Foto text',null=True,blank=True)
    person = models.CharField(max_length=2, verbose_name='Tipo pessoa', default=0, blank=True)
    work_start=models.DateTimeField(blank=True,null=True,verbose_name='Inicio Trabalho')
    work_finish=models.DateTimeField(blank=True,null=True,verbose_name='Final Trabalho')


class SmartAlarmUser(models.Model):
    PARTITIONS = ((1, 'HALL-AUTO-ATENDIMENTO'), (2, 'TESOURARIA'), (3, 'RETAGUARDA'), (4, 'AGENCIA'),)
    user_server_id = models.IntegerField(default=0)
    location = models.CharField(validators=[validate_comma_separated_integer_list], max_length=100, default='')
    full_name = models.CharField(max_length=30, verbose_name=u'Nome Completo')
    job = models.CharField(max_length=100, verbose_name='Empresa', default='')
    pin = models.CharField(max_length=6, default=0, verbose_name=u'Pin', unique=True,
                           error_messages={'unique': u"Esse n\xfamero de Pin j\xe1 foi cadastrado."})
    pin_coercion = models.CharField(max_length=7, default=0, verbose_name=u'Pin Coa\xe7\xe3o', unique=True,
                                    error_messages={
                                        'unique': u"Esse n\xfamero de Pin coa\xe7\xe3o j\xe1 foi cadastrado."})
    force_password_change = models.BooleanField(default=False, verbose_name=u'Mudar Pin')
    creation_date = models.DateTimeField(auto_now_add=True, verbose_name=u'Data Cria\xe7\xe3o')

class Device(models.Model):
    # COUNT_DOOR = (
    #   ('1','1'),
    #   ('2','2'),
    #   ('3','3'),
    #   ('4','4')
    # )
    # MODE=((0, "DOUBLE CUSTODY"), (1, "SIMPLE CUSTODY"))
    # users_door = models.CharField(choices=COUNT_DOOR, default='1', verbose_name=u'Usuarios Abertura ',max_length=2)
    SYSTEM = ((0, 'PROTECAO AMBIENTE'), (1, 'ABERTURA AGENCIA'), (2, 'SMART ALARM'))
    device_server_id = models.IntegerField()
    full_name = models.CharField(max_length=50)
    ip = models.GenericIPAddressField(default='127.0.0.1')
    port = models.IntegerField(default=3333)
    #ip_server = models.GenericIPAddressField(default='127.0.0.1')
    ip_server = models.CharField(default='127.0.0.1', max_length=500)
    port_server = models.IntegerField(default=3071)
    ip_dependent = models.GenericIPAddressField(default='127.0.0.1', blank=True, null=True)
    # mode = models.IntegerField(choices=MODE, default=0)
    system = models.IntegerField(choices=SYSTEM, default=0, verbose_name=u'Sistema')
    uniorg = models.CharField(max_length=8, verbose_name=u'Uniorg', default='001-0000')
    time_zone = models.CharField(max_length=50, verbose_name=u'Time Zone', default="Sao_Paulo")
    block = models.IntegerField(default=0, verbose_name=u'bloqueio')

class SetOutputAlarm(models.Model):
    outputs = models.CharField(validators=[validate_comma_separated_integer_list], max_length=100, default='')
    ip_alarm = models.CharField(default='192.168.2.220', max_length=50)

class ScheduleSmta(models.Model):

    schedule_id = models.IntegerField()

    MODE = ((0, u"DUPLA CUST\xd3DIA"), (1, u"SIMPLES CUST\xd3DIA"))
    
    COUNT_DOOR = (
      ('1','1'),
      ('2','2'),
      ('3','3'),
      ('4','4')
    )

    # Dia de semana dentro do horario
    weekday_start_1=models.TimeField()
    weekday_finish_2=models.TimeField()

    mode_in_schedule_weekday = models.IntegerField(choices=MODE, default=1, verbose_name=u'Mode dentro')
    mode_out_schedule_weekday = models.IntegerField(choices=MODE, default=1, verbose_name=u'mode fora ')

    users_door_in_schedule_weekday = models.CharField(choices=COUNT_DOOR, default='1', verbose_name=u'Usuarios Abertura ',max_length=2)
    users_door_out_schedule_weekday = models.CharField(choices=COUNT_DOOR, default='1', verbose_name=u'Usuarios Abertura ',max_length=2)

    # Final de semana dentro do horario
    weekend_start_1=models.TimeField()
    weekend_finish_2=models.TimeField()

    mode_in_schedule_weekend = models.IntegerField(choices=MODE, default=1, verbose_name=u'Mode dentro')
    mode_out_schedule_weekend = models.IntegerField(choices=MODE, default=1, verbose_name=u'mode fora ')

    users_door_in_schedule_weekend = models.CharField(choices=COUNT_DOOR, default='1', verbose_name=u'Usuarios Abertura ',max_length=2)
    users_door_out_schedule_weekend = models.CharField(choices=COUNT_DOOR, default='1', verbose_name=u'Usuarios Abertura ',max_length=2)

class UsersProcess(models.Model):
    user_server_id = models.IntegerField()
    op = models.CharField(max_length=1)

class CodeOfflineUsed(models.Model):
    code = models.CharField(max_length=10)
    creation_date = models.DateTimeField(auto_now_add=True, verbose_name=u'Data Cria\xe7\xe3o')
