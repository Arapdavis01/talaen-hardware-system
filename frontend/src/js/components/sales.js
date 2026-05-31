function showMpesaPayment(total, customerPhone, onComplete) {
    var self = this;
    var m = document.createElement('div'); m.className = 'modal-overlay';
    m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#10b981);color:white;"><h3 style="color:white;"><i class="fas fa-mobile-alt"></i> M-Pesa Payment</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:1rem;"><div style="font-size:3rem;color:#10b981;"><i class="fas fa-money-bill-wave"></i></div><h3>KES ' + total.toLocaleString() + '</h3></div><div class="form-group"><label>Payment Method</label><select id="mpesaPaymentMethod" class="form-control" onchange="document.getElementById(\'mpesaTillSection\').style.display=this.value===\'till\'?\'block\':\'none\';document.getElementById(\'mpesaStkSection\').style.display=this.value===\'stk\'?\'block\':\'none\';"><option value="stk">Send STK Push</option><option value="till">Till Number Payment</option></select></div><div id="mpesaStkSection"><div class="form-group"><label>Customer Phone Number</label><input type="text" id="mpesaPhone" class="form-control" placeholder="254XXXXXXXXX" value="' + (customerPhone || '') + '"></div><button class="btn btn-success" id="mpesaStkBtn" style="width:100%;"><i class="fas fa-paper-plane"></i> Send STK Push</button><div id="mpesaStkStatus" style="margin-top:0.5rem;text-align:center;"></div></div><div id="mpesaTillSection" style="display:none;"><div class="form-group"><label>M-Pesa Receipt Number</label><input type="text" id="mpesaReceipt" class="form-control" placeholder="e.g., SJK43G5H6K"></div><div class="form-group"><label>Customer Phone (optional)</label><input type="text" id="mpesaPhoneTill" class="form-control" placeholder="254XXXXXXXXX" value="' + (customerPhone || '') + '"></div><button class="btn btn-success" id="mpesaTillBtn" style="width:100%;"><i class="fas fa-check"></i> Confirm Till Payment</button></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button></div></div>';
    document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
    
    m.querySelector('#mpesaStkBtn').onclick = function(){
        var phone = m.querySelector('#mpesaPhone').value.trim();
        if(!phone){alert('Enter phone number!');return;}
        var btn = m.querySelector('#mpesaStkBtn');
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        var statusDiv = m.querySelector('#mpesaStkStatus');
        statusDiv.innerHTML = '<span style="color:#3b82f6;">Sending STK Push... Please check your phone.</span>';
        
        fetch('/api/mpesa/stk-push',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
                phoneNumber: phone,
                amount: Math.round(total),
                accountReference: 'TIH-SALE'
            })
        })
        .then(function(r){return r.json();})
        .then(function(d){
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send STK Push';
            if(d.success){
                statusDiv.innerHTML = '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> STK Push sent! Waiting for payment...</span>';
                // Poll for payment status
                var attempts = 0;
                var checkStatus = setInterval(function(){
                    attempts++;
                    fetch('/api/mpesa/transaction/' + d.checkoutRequestID)
                    .then(function(r){return r.json();})
                    .then(function(t){
                        if(t.status === 'completed'){
                            clearInterval(checkStatus);
                            statusDiv.innerHTML = '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> Payment received! Ref: ' + t.mpesaReceiptNumber + '</span>';
                            setTimeout(function(){ m.remove(); if(onComplete) onComplete({mpesaRef: t.mpesaReceiptNumber, phone: phone}); }, 1000);
                        } else if(t.status === 'failed'){
                            clearInterval(checkStatus);
                            statusDiv.innerHTML = '<span style="color:#ef4444;"><i class="fas fa-times-circle"></i> Payment failed or cancelled</span>';
                        }
                        if(attempts > 30) { clearInterval(checkStatus); statusDiv.innerHTML = '<span style="color:#f59e0b;">Payment check timeout. Please verify manually.</span>'; }
                    });
                }, 2000);
            } else {
                statusDiv.innerHTML = '<span style="color:#ef4444;"><i class="fas fa-times-circle"></i> ' + (d.message || 'Failed to send STK Push') + '</span>';
            }
        })
        .catch(function(e){
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send STK Push';
            statusDiv.innerHTML = '<span style="color:#ef4444;">Network error</span>';
        });
    };
    
    m.querySelector('#mpesaTillBtn').onclick = function(){
        var receipt = m.querySelector('#mpesaReceipt').value.trim();
        var phone = m.querySelector('#mpesaPhoneTill').value.trim();
        if(!receipt){alert('Enter M-Pesa receipt number!');return;}
        m.remove();
        if(onComplete) onComplete({mpesaRef: receipt, phone: phone});
    };
}