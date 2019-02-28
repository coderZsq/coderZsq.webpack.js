;(function() {
    'use strict';

    let $form_add_task = $('.add-task'),
        $body = $('body'),
        $window = $(window),
        $task_delete_trigger,
        $task_detail_trigger,
        $task_detail = $('.task-detail'),
        $task_detail_mask = $('.task-detail-mask'),
        task_list = [],
        current_index,
        $update_form,
        $task_detail_content,
        $task_detail_content_input,
        $checkbox_complete,
        $msg = $('.msg'),
        $msg_content = $msg.find('.msg-content');

    init();

    $form_add_task.on('submit', on_add_task_form_submit);
    $task_detail_mask.on('click', hide_task_detail);

    function pop(arg) {
        if (!arg) {
            console.error('pop title is required');
        }

        let conf = {}, 
            $box, 
            $mask, 
            $title, 
            $content,
            $confirm,
            $cancel,
            dfd,
            confirmed,
            timer;

        dfd = $.Deferred();
        
        if (typeof arg === 'string') {
            conf.title = arg;
        } else {
            conf = $.extend(conf, arg);
        }

        $box = 
        $('<div>' +
            '<div class="pop-title">' + conf.title + '</div>' + 
            '<div class="pop-content">' + 
            '<div><button style="margin-right: 5px;" class="primary confirm">Confirm</button><button class="cancel">Cancel</button></div>' +
            '</div >' +
        '</div>')
        .css({
            color:'#444',
            width:  300,
            height: 'auto',
            padding: '15px 10px',
            background: '#fff',
            position: 'fixed',
            'border-radius': 3,
            'box_shadow': '0 1px 2px rgba(0,0,0,.5)'
        })

        $title = $box.find('.pop-title').css({
            padding: '5px 10px',
            'font-weight': 900,
            'font-size': 20,
            'text-align': 'center'
        })

        $content = $box.find('.pop-content').css({
            padding: '5px 10px', 
            'text-align': 'center'
        })

        $confirm = $content.find('button.confirm')
        $cancel = $content.find('button.cancel')

        $mask = $('<div></div>')
        .css({
            position: 'fixed',
            background: 'rgba(0,0,0,.5)',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        })

        timer = setInterval(function(){
            if (confirmed !== undefined) {
                dfd.resolve(confirmed);
                clearInterval(timer);
                dismiss_pop();
            }
        }, 50);

        $confirm.on('click', on_confirmed);
        $cancel.on('click', on_cancel);
        $mask.on('click', on_cancel);

        function on_cancel() {
            confirmed = false;
        }

        function on_confirmed() {
            confirmed = true;
        }

        function dismiss_pop() {
            $mask.remove();
            $box.remove();
        }

        function adjust_box_position() {
            let window_width = $window.width(),
                window_height = $window.height(),
                box_width = $box.width(),
                box_height = $box.height(),
                move_x,
                move_y;                          
            move_x = (window_width - box_width) / 2;
            move_y = (window_height - box_height) / 2 - 20;
            $box.css({
                left: move_x,
                top: move_y
            })
        }

        $window.on('resize', function() {
            adjust_box_position();
        })

        $mask.appendTo($body);
        $box.appendTo($body);
        $window.resize();
        return dfd.promise();
    }

    function listen_msg_event() {
        $msg_content.on('click', function () {
            hide_msg();
        })
    }

    function on_add_task_form_submit(e) {
        e.preventDefault();
        let new_task = {};
        let $input = $(this).find('input[name=content]');
        new_task.content = $input.val();
        if (!new_task.content) return;
        if (add_task(new_task)) {
            $input.val(null);
        } 
    }

    function listen_task_detail() {
        let index;
        $('.task-item').on('dblclick', function(e){
            index = $(this).data('index');            
            show_task_detail(index);
        })
        $task_detail_trigger.on('click', function (e) {
            let $this = $(this);
            let $item = $this.parent().parent();
            index = $item.data('index');
            show_task_detail(index);
        })
    }

    function listen_checkbox_complete() {
        $checkbox_complete.on('click', function(e){
            let $this = $(this);
            let index = $this.parent().parent().data('index');
            let item = get(index);
            if (item.complete) {
                update_task(index, { complete: false });
            } else {
                update_task(index, { complete: true });
            }
        })
    }

    function get(index) {
        return store.get('task_list')[index];
    }

    function show_task_detail(index) {
        render_task_detail(index);
        current_index = index;
        $task_detail.show();
        $task_detail_mask.show();
    }

    function update_task(index, data) {
        if (index === undefined || !task_list[index]) return;
        task_list[index] = $.extend({}, task_list[index], data);
        refresh_task_list();
    }

    function hide_task_detail(index) {
        $task_detail.hide();
        $task_detail_mask.hide();
    }

    function render_task_detail(index) {
        if (index === undefined || !task_list[index]) return; 
        let item = task_list[index];
        let tpl = 
            '<form>' +
            '<div class="content">' + item.content + '</div>' +
            '<div class="input-item"><input style="display:none;" type="text" name="content" value="' + (item.content || '') + '"></div>' + 
            '<div>' +  
            '<div class="desc input-item">' +
            '<textarea name="desc">' + (item.desc || '') + '</textarea>' +
            '</div>' + 
            '</div>' + 
            '<div class="remind input-item">' +
            '<label>Remind Date</label>' +
            '<input class="datetime" name="remind_date" type="text" value="' + (item.remind_date || '') + '">' + 
            '</div>' + 
            '<div class="input-item"><button type="submit">Update</button></div>' +
            '</form>';
        $task_detail.html(null);
        $task_detail.html(tpl);
        $('.datetime').datetimepicker();
        $update_form = $task_detail.find('form');
        $task_detail_content = $update_form.find('.content');
        $task_detail_content_input = $update_form.find('[name=content]');
        $task_detail_content.on('dblclick', function(e){
            $task_detail_content_input.show();
            $task_detail_content.hide();            
        })
        $update_form.on('submit', function(e){
            e.preventDefault();
            let data = {};
            data.content = $(this).find('[name=content]').val();
            data.desc = $(this).find('[name=desc]').val();
            data.remind_date = $(this).find('[name=remind_date]').val();            
            update_task(index, data);
            hide_task_detail();
        })
    }

    function listen_task_delete() {
        $task_delete_trigger.on('click', function (e) {
            let $this = $(this);
            let $item = $this.parent().parent();
            let index = $item.data('index');
            pop('Confirm Delete?')
            .then(function(r) {
                r ? delete_task(index) : null;
            })
        })
    }

    function add_task(new_task) {
        task_list.push(new_task);
        refresh_task_list()
        return true;
    }

    function refresh_task_list() {
        store.set('task_list', task_list);
        render_task_list();
    }

    function delete_task(index) {
        if (index === undefined || !task_list[index]) return;
        delete task_list[index];
        refresh_task_list()
    }

    function init() {        
        // store.clearAll();
        task_list = store.get('task_list') || []
        if (task_list.length) {
            render_task_list();
        }
        task_remind_check();
        listen_msg_event();
    }

    function task_remind_check() {
        let current_timestamp;
        let itl = setInterval(function() {
            for (let i = 0; i < task_list.length; i++) {
                let item = get(i),
                    task_timestamp;
                if (!item || !item.remind_date || item.informed) {
                    continue;
                }
                current_timestamp = (new Date()).getTime();
                task_timestamp = (new Date(item.remind_date)).getTime();
                if (current_timestamp - task_timestamp >= 1) {
                    update_task(i, {informed: true});
                    show_msg(item.content);
                }
            }
        }, 300);
    }

    function show_msg(msg) {
        $msg_content.html(msg)
        $msg.show();
    }

    function hide_msg() {
        $msg.hide();
    }

    function render_task_list() {
        let $task_list = $('.task-list');
        $task_list.html('');
        let complete_items = [];
        for (let i = 0; i < task_list.length; i++) {
            var item = task_list[i];
            if (item && item.complete) {
                complete_items[i] = item;
            } else {
                let $task = render_task_item(item, i);
                $task_list.prepend($task);
            }
        }

        for (let i = 0; i < complete_items.length; i++) {
            let $task = render_task_item(complete_items[i], i);
            if (!$task) continue;
            $task.addClass('completed');
            $task_list.append($task);
        }

        $task_delete_trigger = $('.action.delete');
        $task_detail_trigger = $('.action.detail');
        $checkbox_complete = $('.task-list .complete[type=checkbox]');
        listen_task_delete();
        listen_task_detail();
        listen_checkbox_complete();
    }

    function render_task_item(data, index) {
        if (!data || !index) return;
        let list_item_tpl =
            '<div class="task-item" data-index="' + index + '">' +
            '<span><input class="complete" ' + (data.complete ? 'checked' : '') +' type="checkbox"></span>' +
            '<span class="task-content">' + data.content + '</span>' +
            '<span class="fr">' +
            '<span class="action delete"> Delete</span>' +
            '<span class="action detail"> Detail</span>' +
            '</span>' + 
            '</div>';
        return $(list_item_tpl);
    }
})() 