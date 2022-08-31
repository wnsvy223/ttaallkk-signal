'use strict';

export function toastError(text){
    $.toast({
        heading: 'Error', 
        text: text,
        position: 'bottom-center',
        bgColor: '#d30d0d',
        textColor: '#ffffff',
        loader: false,
        stack: false,
        textAlign: 'center'
    });
}

export function toastSuccess(text){
    $.toast({
        heading: 'Success', 
        text: text,
        position: 'bottom-center',
        bgColor: '#02ac35',
        textColor: '#ffffff',
        loader: false,
        stack: false,
        textAlign: 'center'
    });
}

export function toastWarning(text){
    $.toast({
        heading: 'Warning', 
        text: text,
        position: 'bottom-center',
        bgColor: '#f58300',
        textColor: '#ffffff',
        loader: false,
        stack: false,
        textAlign: 'center'
    });
}