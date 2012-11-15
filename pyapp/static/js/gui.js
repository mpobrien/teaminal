$(document).ready(function(){
    $('input[name="optionsRadios"]').change(function(){
        br_screen.setFont($(this).val())
        screen.dirtyAll = true;
        br_screen.clear();
        br_screen.canvasDisplay();
    });

    $('#settings').click(function(){
        $('#myModal').modal()
    });
});
