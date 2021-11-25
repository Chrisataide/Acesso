from django.conf.urls import url

from . import views


urlpatterns = [
    url(r'^controls/index_access/$', views.index_access, name='controls.views.access_pin'),
    url(r'^controls/index_alarm/$', views.index_alarm, name='controls.views.alarm_pin'),
    url(r'^controls/arm_desarm/$', views.arm_desarm_smartalarm, name='controls.views.arm_desarm_smartalarm'),
    url(r'^controls/confirm_auth/$', views.confirm_auth, name='controls.views.confirm_auth'),
    url(r'^controls/alter_pass/$', views.alter_pass, name='controls.views.alter_pass'),
    url(r'^controls/set_partition/$', views.set_partition, name='controls.views.set_partition'),
    url(r'^controls/confirm_auth_smartalarm/$', views.confirm_auth_smartalarm, name='controls.views.confirm_auth_smartalarm'),
    url(r'^controls/request_access/$', views.request_access, name='controls.views.request_access'),
    url(r'^controls/set_device/$', views.set_device, name='controls.views.set_device'),
    url(r'^controls/set_schedule/$', views.set_schedule, name='controls.views.set_schedule'),
    url(r'^controls/set_users/$', views.set_users, name='controls.views.set_users'),
    url(r'^controls/delete-user/(?P<id>\d+)$', views.delete_users, name='controls.views.delete_users'),
    url(r'^controls/delete_users_alarm/$', views.delete_users_alarm, name='controls.views.delete_users_alarm'),
    url(r'^controls/set_smartalarm_user/$', views.set_smartalarm_user, name='controls.views.set_smartalarm_user'),
    url(r'^controls/enable_system/$', views.set_enable_system, name='controls.views.enable_system'),
    url(r'^controls/check_system/$', views.check_enable_system, name='controls.views.check_system'),
    url(r'^getAllStatusZones/$', views.get_all_status_zones, name='smartaccess.controls.views.get_all_status_zones'),
    url(r'^getStatus/$', views.check_status, name='controls.views.check_status'),
    url(r'^openDoor/$', views.open_door, name='controls.views.open_door'),
    url(r'^remoteBlock/$', views.remoteBlock, name='controls.views.remoteBlock'),
    url(r'^is_block/$', views.is_block, name='controls.views.is_block'),
    url(r'^controls/capture_img/$', views.capture_save, name='controls.views.capture_save'),
    url(r'^controls/confirm_password/$', views.confirm_password, name='smartaccess.controls.views.confirm_password'),
    url(r'^controls/hour_date/$', views.hour_date, name='smartaccess.controls.views.hour_date'),
    url(r'^controls/lock/alter_user/$', views.lock_alter_user, name='smartaccess.controls.views.lock.alter_user'),
    url(r'^controls/lock/action_lock/$', views.lock_action, name='smartaccess.controls.views.lock.action'),
    url(r'^controls/check_connection/$', views.check_connection, name='smartaccess.controls.views.check_connection'),

    #correção feriado 
    url(r'^set_holiday$', views.set_holiday, name='controls.views.set_holiday'),

]
