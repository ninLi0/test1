# filehandling/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('get-public-key/', views.get_public_key, name='get_public_key'),
    path('receive_encrypted_key/', views.receive_encrypted_key, name='receive_encrypted_key'),
    path('upload/', views.upload_file, name='upload_file'),
    path('download/<str:file_name>/', views.download_file, name='download_file'),
    path('list_files/', views.list_files, name='list_files'),
]
