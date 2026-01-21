from django.urls import path
from .views import PDFAnalysisView

urlpatterns = [
    path('analyze-pdf/', PDFAnalysisView.as_view(), name='analyze-pdf'),
]
